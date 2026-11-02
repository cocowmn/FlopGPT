mod server;
mod tls;

use std::path::PathBuf;
use std::sync::atomic::Ordering;

use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{AppHandle, Emitter, Manager, State, WebviewUrl, WebviewWindowBuilder, WindowEvent};
use tauri_plugin_dialog::DialogExt;
use tokio::sync::Mutex;

use server::{Hub, Server, Snapshot, Status};

type ServerState = Mutex<Server>;

/// Server settings, kept in `server.json` in the app's config folder.
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct Settings {
    port: u16,
    phone_edit: bool,
    https: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            port: server::DEFAULT_PORT,
            phone_edit: true,
            https: false,
        }
    }
}

fn settings_path(app: &AppHandle) -> Option<PathBuf> {
    app.path().app_config_dir().ok().map(|d| d.join("server.json"))
}

fn load_settings(app: &AppHandle) -> Settings {
    settings_path(app)
        .and_then(|p| std::fs::read_to_string(p).ok())
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn save_settings(app: &AppHandle, s: &Server) -> Result<(), String> {
    let path = settings_path(app).ok_or("no config directory")?;
    if let Some(dir) = path.parent() {
        std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    }
    let settings = Settings {
        port: s.configured_port,
        phone_edit: s.hub.phone_edit.load(Ordering::Relaxed),
        https: s.https,
    };
    std::fs::write(path, serde_json::to_string(&settings).unwrap()).map_err(|e| e.to_string())
}

#[tauri::command]
async fn server_status(state: State<'_, ServerState>) -> Result<Status, String> {
    Ok(state.lock().await.status())
}

#[tauri::command]
async fn server_start(state: State<'_, ServerState>) -> Result<Status, String> {
    let mut s = state.lock().await;
    s.start().await;
    Ok(s.status())
}

#[tauri::command]
async fn server_stop(state: State<'_, ServerState>) -> Result<Status, String> {
    let mut s = state.lock().await;
    s.stop().await;
    Ok(s.status())
}

#[tauri::command]
async fn server_set_port(app: AppHandle, state: State<'_, ServerState>, port: u16) -> Result<Status, String> {
    if port < 1024 {
        return Err("Use a port from 1024 to 65535.".into());
    }
    let mut s = state.lock().await;
    s.configured_port = port;
    save_settings(&app, &s)?;
    s.stop().await;
    s.start().await;
    Ok(s.status())
}

#[tauri::command]
async fn server_set_phone_edit(app: AppHandle, state: State<'_, ServerState>, on: bool) -> Result<Status, String> {
    let mut s = state.lock().await;
    s.hub.phone_edit.store(on, Ordering::Relaxed);
    save_settings(&app, &s)?;
    Ok(s.status())
}

#[tauri::command]
async fn server_set_https(app: AppHandle, state: State<'_, ServerState>, on: bool) -> Result<Status, String> {
    let mut s = state.lock().await;
    s.https = on;
    save_settings(&app, &s)?;
    s.stop().await;
    s.start().await;
    Ok(s.status())
}

/// Replaces the CA with a new one; phones that trusted the old one have to be set up again.
#[tauri::command]
async fn server_reset_cert(state: State<'_, ServerState>) -> Result<Status, String> {
    let mut s = state.lock().await;
    s.stop().await;
    s.reset_cert()?;
    s.start().await;
    Ok(s.status())
}

#[tauri::command]
fn server_qr(url: String) -> Result<String, String> {
    server::qr_svg(&url)
}

#[tauri::command]
fn config_load(hub: State<'_, Hub>) -> Snapshot {
    hub.snapshot()
}

#[tauri::command]
fn config_save(hub: State<'_, Hub>, config: Option<Value>) -> Result<u64, String> {
    hub.save(config)
}

/// Asks where to save, then writes the .zip there. Returns the path, or None if cancelled.
#[tauri::command]
async fn export_zip(app: AppHandle, name: String, bytes: Vec<u8>) -> Result<Option<String>, String> {
    save_as(&app, &name, "Zip archive", "zip", &bytes)
}

fn save_as(app: &AppHandle, name: &str, kind: &str, ext: &str, data: &[u8]) -> Result<Option<String>, String> {
    let Some(picked) = app
        .dialog()
        .file()
        .set_file_name(name)
        .add_filter(kind, &[ext])
        .blocking_save_file()
    else {
        return Ok(None);
    };
    let path = picked.into_path().map_err(|e| e.to_string())?;
    std::fs::write(&path, data).map_err(|e| e.to_string())?;
    Ok(Some(path.display().to_string()))
}

/// Opens Settings or the editor in a window of its own, or brings it forward if it's open.
/// The page draws its own close button, so the window has none.
#[tauri::command]
async fn open_window(app: AppHandle, kind: String, section: Option<String>) -> Result<(), String> {
    if let Some(win) = app.get_webview_window(&kind) {
        return win.set_focus().map_err(|e| e.to_string());
    }
    let (title, w, h, resizable) = match kind.as_str() {
        "settings" => ("Settings", 560.0, 600.0, false),
        "editor" => ("Editor", 720.0, 700.0, true),
        _ => return Err(format!("no {kind} window")),
    };
    let section = serde_json::to_string(&section).unwrap();
    let mut builder = WebviewWindowBuilder::new(&app, &kind, WebviewUrl::App("index.html".into()))
        .title(title)
        .inner_size(w, h)
        .min_inner_size(520.0, 480.0)
        .resizable(resizable)
        .disable_drag_drop_handler()
        .initialization_script(format!("window.__FLOP_SECTION__ = {section};"));
    // Centered over the chat window.
    if let Some(main) = app.get_webview_window("main") {
        if let (Ok(pos), Ok(size), Ok(scale)) = (main.outer_position(), main.outer_size(), main.scale_factor()) {
            let (pos, size) = (pos.to_logical::<f64>(scale), size.to_logical::<f64>(scale));
            builder = builder.position(pos.x + (size.width - w) / 2.0, pos.y + (size.height - h) / 2.0);
        }
    }
    #[cfg(target_os = "macos")]
    let builder = builder
        .title_bar_style(tauri::TitleBarStyle::Overlay)
        .hidden_title(true);
    #[cfg(not(target_os = "macos"))]
    let builder = builder.decorations(false);
    let win = builder.build().map_err(|e| e.to_string())?;
    #[cfg(target_os = "macos")]
    hide_window_buttons(&win);
    #[cfg(not(target_os = "macos"))]
    let _ = win;
    Ok(())
}

/// Hides the Mac window's close, minimize and zoom buttons, keeping its rounded corners and shadow.
#[cfg(target_os = "macos")]
fn hide_window_buttons(win: &tauri::WebviewWindow) {
    use objc2_app_kit::{NSWindow, NSWindowButton};
    let handle = win.clone();
    let _ = win.run_on_main_thread(move || {
        let Ok(ptr) = handle.ns_window() else { return };
        // SAFETY: Tauri hands back this window's NSWindow, and AppKit is only touched on the main thread.
        let ns = unsafe { &*ptr.cast::<NSWindow>() };
        for b in [
            NSWindowButton::CloseButton,
            NSWindowButton::MiniaturizeButton,
            NSWindowButton::ZoomButton,
        ] {
            if let Some(button) = ns.standardWindowButton(b) {
                button.setHidden(true);
            }
        }
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let handle = app.handle().clone();
            let settings = load_settings(&handle);
            let data_dir = app.path().app_data_dir()?;
            let tls_dir = app.path().app_config_dir()?.join("tls");
            let hub = Hub::new(data_dir.join("config.json"), settings.phone_edit);

            // Tell the window when the config changes (e.g. a phone saved an edit).
            let mut changes = hub.subscribe();
            let emitter = handle.clone();
            tauri::async_runtime::spawn(async move {
                while changes.changed().await.is_ok() {
                    let rev = *changes.borrow_and_update();
                    let _ = emitter.emit("config-changed", rev);
                }
            });

            app.manage(hub.clone());
            app.manage::<ServerState>(Mutex::new(Server::new(hub, settings.port, settings.https, tls_dir)));
            tauri::async_runtime::spawn(async move {
                handle.state::<ServerState>().lock().await.start().await;
            });
            Ok(())
        })
        // Settings and the editor go with the chat window: closing it closes them.
        .on_window_event(|win, event| {
            if win.label() == "main" && matches!(event, WindowEvent::Destroyed) {
                for (label, other) in win.app_handle().webview_windows() {
                    if label != "main" {
                        let _ = other.close();
                    }
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            server_status,
            server_start,
            server_stop,
            server_set_port,
            server_set_phone_edit,
            server_set_https,
            server_reset_cert,
            server_qr,
            config_load,
            config_save,
            export_zip,
            open_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
