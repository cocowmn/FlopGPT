//! LAN HTTP server: serves the built page in `dist/` (embedded into the binary) so phones on the
//! same network can open it, plus the app's saved config, which phones can read, change
//! and follow live. With HTTPS turned on, the same port also speaks TLS (see `tls.rs`), so phones
//! that trust the app's CA can install the page as an app, and the rest keep using plain HTTP.

use std::collections::HashMap;
use std::convert::Infallible;
use std::net::{IpAddr, SocketAddr};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use axum::extract::{ConnectInfo, DefaultBodyLimit, Request, State};
use axum::http::{header, HeaderValue, StatusCode};
use axum::middleware::{self, Next};
use axum::response::sse::{Event, KeepAlive, Sse};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::Extension;
use axum::{Json, Router};
use futures_util::StreamExt;
use hyper_util::rt::{TokioExecutor, TokioIo};
use hyper_util::server::conn::auto;
use hyper_util::service::TowerToHyperService;
use rust_embed::RustEmbed;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tokio::io::{AsyncRead, AsyncWrite};
use tokio::net::TcpListener;
use tokio::sync::watch;
use tokio_rustls::TlsAcceptor;
use tokio_stream::wrappers::WatchStream;

use crate::tls::{self, Ca, Resolver};

#[derive(RustEmbed)]
#[folder = "../dist/"]
struct Assets;

pub const DEFAULT_PORT: u16 = 8787;
const PORT_TRIES: u16 = 20;
const CONNECTED_SECS: u64 = 120;
const MAX_BODY: usize = 10 * 1024 * 1024;
const FIRST_BYTE_SECS: u64 = 10;
const CERT_PAGE: &str = include_str!("cert.html");

struct Client {
    requests: u64,
    last_seen: Instant,
    open: u32, // live-sync streams currently open, i.e. pages showing the demo right now
}

#[derive(Default)]
struct Stats {
    requests: u64,
    clients: HashMap<IpAddr, Client>,
}

/// The saved config (None = the built-in one) and a revision bumped on every save.
struct Store {
    config: Option<Value>,
    rev: u64,
}

/// State shared between the Tauri commands and the running server.
#[derive(Clone)]
pub struct Hub {
    store: Arc<Mutex<Store>>,
    path: Arc<PathBuf>,
    changes: Arc<watch::Sender<u64>>,
    pub phone_edit: Arc<AtomicBool>,
    stats: Arc<Mutex<Stats>>,
}

#[derive(Serialize)]
pub struct Snapshot {
    rev: u64,
    config: Value,
    saved: bool, // false = the built-in config (nothing saved yet)
    writable: bool,
}

/// The config the app ships with, used until one is saved.
fn builtin() -> Value {
    serde_json::from_str(include_str!("../default-config.json")).expect("default-config.json is valid JSON")
}

impl Hub {
    /// Loads the config saved at `path`, if any.
    pub fn new(path: PathBuf, phone_edit: bool) -> Self {
        let config = std::fs::read_to_string(&path)
            .ok()
            .and_then(|s| serde_json::from_str::<Value>(&s).ok());
        // Start from the clock so revisions keep rising across app restarts; pages left open
        // then still see the next save as newer than what they have.
        let rev = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis() as u64)
            .unwrap_or(1);
        Self {
            store: Arc::new(Mutex::new(Store { config, rev })),
            path: Arc::new(path),
            changes: Arc::new(watch::channel(rev).0),
            phone_edit: Arc::new(AtomicBool::new(phone_edit)),
            stats: Arc::default(),
        }
    }

    pub fn snapshot(&self) -> Snapshot {
        let s = self.store.lock().unwrap();
        Snapshot {
            rev: s.rev,
            config: s.config.clone().unwrap_or_else(builtin),
            saved: s.config.is_some(),
            writable: self.phone_edit.load(Ordering::Relaxed),
        }
    }

    /// Saves the config to disk (None deletes it, going back to the default) and tells everyone.
    pub fn save(&self, config: Option<Value>) -> Result<u64, String> {
        let rev = {
            let mut s = self.store.lock().unwrap();
            match &config {
                Some(v) => {
                    if let Some(dir) = self.path.parent() {
                        std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
                    }
                    let tmp = self.path.with_extension("json.tmp");
                    std::fs::write(&tmp, serde_json::to_string_pretty(v).unwrap()).map_err(|e| e.to_string())?;
                    std::fs::rename(&tmp, &*self.path).map_err(|e| e.to_string())?;
                }
                None => match std::fs::remove_file(&*self.path) {
                    Err(e) if e.kind() != std::io::ErrorKind::NotFound => return Err(e.to_string()),
                    _ => {}
                },
            }
            s.config = config;
            s.rev += 1;
            s.rev
        };
        self.changes.send_replace(rev);
        Ok(rev)
    }

    pub fn subscribe(&self) -> watch::Receiver<u64> {
        self.changes.subscribe()
    }
}

/// Per-run router state: the hub, the CA phones download (HTTPS only), and a signal that fires
/// when the server is stopped.
#[derive(Clone)]
struct Ctx {
    hub: Hub,
    ca: Option<Arc<[u8]>>,
    stopping: watch::Receiver<bool>,
}

/// The running server's TLS side: the CA, and the server certificate for the LAN addresses it was
/// issued for, swapped for a new one when they change.
struct Tls {
    ca: Ca,
    resolver: Arc<Resolver>,
    ips: Vec<IpAddr>,
}

pub struct Server {
    pub hub: Hub,
    pub configured_port: u16,
    pub https: bool,
    tls_dir: PathBuf,
    tls: Option<Tls>,
    port: Option<u16>,
    error: Option<String>,
    cert_error: Option<String>,
    stop: Option<watch::Sender<bool>>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClientInfo {
    ip: String,
    requests: u64,
    last_seen_secs: u64,
    open: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Status {
    running: bool,
    port: Option<u16>,
    configured_port: u16,
    error: Option<String>,
    local_url: Option<String>,
    lan_urls: Vec<String>,
    setup_urls: Vec<String>, // plain HTTP pages where phones get the CA (HTTPS only)
    requests: u64,
    clients: Vec<ClientInfo>,
    phone_edit: bool,
    https: bool, // serving HTTPS right now
    cert_error: Option<String>,
}

impl Server {
    pub fn new(hub: Hub, configured_port: u16, https: bool, tls_dir: PathBuf) -> Self {
        Self {
            hub,
            configured_port,
            https,
            tls_dir,
            tls: None,
            port: None,
            error: None,
            cert_error: None,
            stop: None,
        }
    }

    pub fn running(&self) -> bool {
        self.stop.is_some()
    }

    /// Binds the configured port, or the next free one, and serves until `stop` is called.
    pub async fn start(&mut self) {
        if self.running() {
            return;
        }
        let mut last_err = None;
        let mut listener = None;
        for p in self.configured_port..self.configured_port.saturating_add(PORT_TRIES) {
            match tokio::net::TcpListener::bind(("0.0.0.0", p)).await {
                Ok(l) => {
                    listener = Some((l, p));
                    break;
                }
                Err(e) => last_err = Some(e),
            }
        }
        let Some((listener, port)) = listener else {
            self.error = Some(format!(
                "Couldn't open ports {}-{}: {}",
                self.configured_port,
                self.configured_port.saturating_add(PORT_TRIES - 1),
                last_err.map(|e| e.to_string()).unwrap_or_default()
            ));
            return;
        };

        self.tls = None;
        self.cert_error = None;
        if self.https {
            match self.load_tls() {
                Ok(t) => self.tls = Some(t),
                Err(e) => self.cert_error = Some(format!("HTTPS is off: {e}")),
            }
        }

        let (tx, mut rx) = watch::channel(false);
        let ctx = Ctx {
            hub: self.hub.clone(),
            ca: self.tls.as_ref().map(|t| Arc::from(t.ca.der())),
            stopping: rx.clone(),
        };
        let app = Router::new()
            .route("/api/config", get(get_config).put(put_config))
            .route("/api/events", get(events))
            .route("/cert", get(cert_page))
            .route("/cert/ca.crt", get(cert_file))
            .fallback(serve)
            .layer(DefaultBodyLimit::max(MAX_BODY))
            .layer(middleware::from_fn_with_state(self.hub.clone(), track))
            .with_state(ctx);
        let acceptor = self
            .tls
            .as_ref()
            .map(|t| TlsAcceptor::from(tls::server_config(t.resolver.clone())));
        tauri::async_runtime::spawn(async move {
            if let Some(acceptor) = acceptor {
                return serve_both(listener, app, acceptor, rx).await;
            }
            let svc = app.into_make_service_with_connect_info::<SocketAddr>();
            let _ = axum::serve(listener, svc)
                .with_graceful_shutdown(async move {
                    let _ = rx.changed().await;
                })
                .await;
        });
        self.port = Some(port);
        self.error = None;
        self.stop = Some(tx);
    }

    fn load_tls(&self) -> Result<Tls, String> {
        let ca = Ca::load_or_create(&self.tls_dir)?;
        let ips = lan_ips();
        let resolver = Arc::new(Resolver::new(ca.issue(&ips)?));
        Ok(Tls { ca, resolver, ips })
    }

    pub fn stop(&mut self) {
        if let Some(tx) = self.stop.take() {
            let _ = tx.send(true);
        }
        self.port = None;
    }

    /// Deletes the CA, so the next start makes a new one that phones have to trust again.
    pub fn reset_cert(&self) -> Result<(), String> {
        Ca::remove(&self.tls_dir)
    }

    /// Also renews the server certificate if this machine's LAN addresses changed (new wifi).
    pub fn status(&mut self) -> Status {
        let port = self.port.filter(|_| self.running());
        let ips = lan_ips();
        if let Some(t) = self.tls.as_mut().filter(|t| t.ips != ips) {
            match t.ca.issue(&ips) {
                Ok(key) => {
                    t.resolver.set(key);
                    t.ips = ips.clone();
                }
                Err(e) => self.cert_error = Some(format!("Couldn't renew the certificate: {e}")),
            }
        }
        let https = self.tls.is_some();
        let scheme = if https { "https" } else { "http" };
        let lan_urls = port
            .map(|p| ips.iter().map(|ip| format!("{scheme}://{ip}:{p}/")).collect())
            .unwrap_or_default();
        let setup_urls = port
            .filter(|_| https)
            .map(|p| ips.iter().map(|ip| format!("http://{ip}:{p}/cert")).collect())
            .unwrap_or_default();

        let stats = self.hub.stats.lock().unwrap();
        let mut clients: Vec<ClientInfo> = stats
            .clients
            .iter()
            .filter(|(ip, c)| !ip.is_loopback() && (c.open > 0 || c.last_seen.elapsed().as_secs() < CONNECTED_SECS))
            .map(|(ip, c)| ClientInfo {
                ip: ip.to_string(),
                requests: c.requests,
                last_seen_secs: c.last_seen.elapsed().as_secs(),
                open: c.open > 0,
            })
            .collect();
        clients.sort_by_key(|c| c.last_seen_secs);

        Status {
            running: self.running(),
            port,
            configured_port: self.configured_port,
            error: self.error.clone(),
            local_url: port.map(|p| format!("{scheme}://localhost:{p}/")),
            lan_urls,
            setup_urls,
            requests: stats.requests,
            clients,
            phone_edit: self.hub.phone_edit.load(Ordering::Relaxed),
            https,
            cert_error: self.cert_error.clone(),
        }
    }
}

/// Serves plain HTTP and HTTPS on one port: a connection that opens with a TLS handshake
/// (first byte 0x16) gets TLS, anything else plain HTTP. Phones that don't trust the CA yet can
/// still open the page, and the setup page where they get the CA, at the same address.
async fn serve_both(listener: TcpListener, app: Router, acceptor: TlsAcceptor, mut stopping: watch::Receiver<bool>) {
    loop {
        let (stream, addr) = tokio::select! {
            r = listener.accept() => match r {
                Ok(c) => c,
                Err(_) => continue,
            },
            _ = stopping.changed() => return,
        };
        let app = app.clone().layer(Extension(ConnectInfo(addr)));
        let acceptor = acceptor.clone();
        let stopping = stopping.clone();
        tauri::async_runtime::spawn(async move {
            let mut first = [0u8; 1];
            let peek = tokio::time::timeout(Duration::from_secs(FIRST_BYTE_SECS), stream.peek(&mut first));
            if !matches!(peek.await, Ok(Ok(1))) {
                return;
            }
            if first[0] == 0x16 {
                if let Ok(tls) = acceptor.accept(stream).await {
                    serve_conn(tls, app, stopping).await;
                }
            } else {
                serve_conn(stream, app, stopping).await;
            }
        });
    }
}

async fn serve_conn<S>(io: S, app: Router, mut stopping: watch::Receiver<bool>)
where
    S: AsyncRead + AsyncWrite + Unpin + Send + 'static,
{
    let builder = auto::Builder::new(TokioExecutor::new());
    let conn = builder.serve_connection_with_upgrades(TokioIo::new(io), TowerToHyperService::new(app));
    tokio::pin!(conn);
    tokio::select! {
        _ = conn.as_mut() => {}
        _ = async { let _ = stopping.wait_for(|s| *s).await; } => {
            conn.as_mut().graceful_shutdown();
            let _ = conn.await;
        }
    }
}

/// Private (LAN) IPv4 addresses of this machine, e.g. 192.168.1.20.
fn lan_ips() -> Vec<IpAddr> {
    let mut ips: Vec<IpAddr> = local_ip_address::list_afinet_netifas()
        .unwrap_or_default()
        .into_iter()
        .map(|(_, ip)| ip)
        .filter(|ip| matches!(ip, IpAddr::V4(v4) if v4.is_private() && !v4.is_loopback()))
        .collect();
    ips.sort();
    ips.dedup();
    // Put the address the OS would use for outbound traffic first (usually the wifi one).
    if let Ok(primary) = local_ip_address::local_ip() {
        if let Some(i) = ips.iter().position(|ip| *ip == primary) {
            ips.swap(0, i);
        }
    }
    ips
}

async fn track(
    State(hub): State<Hub>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    req: Request,
    next: Next,
) -> Response {
    {
        let mut stats = hub.stats.lock().unwrap();
        stats.requests += 1;
        let c = stats.clients.entry(addr.ip()).or_insert(Client {
            requests: 0,
            last_seen: Instant::now(),
            open: 0,
        });
        c.requests += 1;
        c.last_seen = Instant::now();
    }
    let mut res = next.run(req).await;
    res.headers_mut()
        .insert(header::CACHE_CONTROL, HeaderValue::from_static("no-store"));
    res
}

async fn get_config(State(ctx): State<Ctx>) -> Json<Snapshot> {
    Json(ctx.hub.snapshot())
}

#[derive(Deserialize)]
struct PutConfig {
    config: Option<Value>,
}

async fn put_config(State(ctx): State<Ctx>, Json(body): Json<PutConfig>) -> Response {
    if !ctx.hub.phone_edit.load(Ordering::Relaxed) {
        return (StatusCode::FORBIDDEN, "Phone editing is turned off in the app.").into_response();
    }
    match ctx.hub.save(body.config) {
        Ok(rev) => Json(serde_json::json!({ "rev": rev })).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e).into_response(),
    }
}

/// Marks a client as having a live page open for as long as its event stream lives.
struct OpenGuard {
    hub: Hub,
    ip: IpAddr,
}

impl Drop for OpenGuard {
    fn drop(&mut self) {
        let mut stats = self.hub.stats.lock().unwrap();
        if let Some(c) = stats.clients.get_mut(&self.ip) {
            c.open = c.open.saturating_sub(1);
            c.last_seen = Instant::now();
        }
    }
}

/// Server-sent events: the config revision now, then again after every save.
async fn events(State(ctx): State<Ctx>, ConnectInfo(addr): ConnectInfo<SocketAddr>) -> impl IntoResponse {
    {
        let mut stats = ctx.hub.stats.lock().unwrap();
        if let Some(c) = stats.clients.get_mut(&addr.ip()) {
            c.open += 1;
        }
    }
    let guard = OpenGuard {
        hub: ctx.hub.clone(),
        ip: addr.ip(),
    };
    let mut stopping = ctx.stopping.clone();
    let stream = WatchStream::new(ctx.hub.subscribe())
        .map(move |rev| {
            let _ = &guard;
            Ok::<_, Infallible>(Event::default().data(rev.to_string()))
        })
        // End the stream when the server stops, so shutdown doesn't wait on open pages.
        .take_until(async move {
            let _ = stopping.wait_for(|s| *s).await;
        });
    Sse::new(stream).keep_alive(KeepAlive::default())
}

/// How to trust the app's CA on a phone (HTTPS only).
async fn cert_page(State(ctx): State<Ctx>) -> Response {
    if ctx.ca.is_none() {
        return StatusCode::NOT_FOUND.into_response();
    }
    ([(header::CONTENT_TYPE, "text/html; charset=utf-8")], CERT_PAGE).into_response()
}

/// The CA certificate. iOS Safari offers to install it as a profile; Android saves it for
/// Settings > Security > Install a certificate.
async fn cert_file(State(ctx): State<Ctx>) -> Response {
    let Some(ca) = ctx.ca else {
        return StatusCode::NOT_FOUND.into_response();
    };
    (
        [
            (header::CONTENT_TYPE, "application/x-x509-ca-cert"),
            (header::CONTENT_DISPOSITION, "attachment; filename=\"FlopGPT-CA.crt\""),
        ],
        ca.to_vec(),
    )
        .into_response()
}

fn asset(path: &str) -> Option<Response> {
    let file = Assets::get(path)?;
    let mime = mime_guess::from_path(path).first_or_octet_stream();
    Some(
        (
            [(header::CONTENT_TYPE, mime.as_ref().to_string())],
            file.data.into_owned(),
        )
            .into_response(),
    )
}

async fn serve(req: Request) -> Response {
    let path = req.uri().path().trim_start_matches('/');
    let path = if path.is_empty() { "index.html" } else { path };
    if let Some(r) = asset(path) {
        return r;
    }
    // A page opened at a deeper path (e.g. /c/8f3a2b) asks for /c/style.css:
    // fall back to the file by name, and to index.html for extensionless page paths.
    let base = path.rsplit('/').next().unwrap_or(path);
    if let Some(r) = asset(base) {
        return r;
    }
    if !base.contains('.') {
        if let Some(r) = asset("index.html") {
            return r;
        }
    }
    StatusCode::NOT_FOUND.into_response()
}

/// QR code for a URL, as an SVG string.
pub fn qr_svg(url: &str) -> Result<String, String> {
    let code = qrcode::QrCode::new(url.as_bytes()).map_err(|e| e.to_string())?;
    Ok(code
        .render::<qrcode::render::svg::Color>()
        .min_dimensions(160, 160)
        .quiet_zone(true)
        .build())
}
