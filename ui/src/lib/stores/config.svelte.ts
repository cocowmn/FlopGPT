/* ------------------------------------------------------------------ *
 *  Config: one JSON (script settings, responses and threads) saved by the desktop app.
 *  The app window reads and saves it through Tauri; phones through the app's server.
 * ------------------------------------------------------------------ */
import { exportJson, fetchConfig, HttpError, putConfig, TAURI, watchConfig } from '../backend';
import { isJson, takeLegacy, toLogoDataURL } from '../files';
import { detect, merge, normalizeScript, normalizeThreads } from '../normalize';
import type { Config, Thread } from '../types';
import { chat } from './chat.svelte';
import { ui } from './ui.svelte';

const EMPTY_CONFIG: Config = { responses: [], threads: [] }; // shown only until the app answers

class ConfigStore {
  config = $state.raw<Config>(EMPTY_CONFIG); // the whole config
  script = $state.raw<Config>(EMPTY_CONFIG); // the same, checked to be playable
  threads = $state.raw<Thread[]>([]);
  pending = $state.raw<Config | null>(null); // a newer config that arrived mid-chat; applied at the next New chat
  writable = $state(false); // can this page save to the app? (phones: only if the app allows it)
  rev = 0; // revision of the saved config this page has
  seenRev = 0; // newest revision announced while we were saving
  saving = false;

  brand = $derived.by(() => {
    const s = this.script;
    const name = s.appName || 'Nova';
    const user = String(s.userName || 'You');
    return {
      name,
      model: s.modelName || name,
      greeting: s.greeting || 'How can I help you today?',
      placeholder: s.placeholder || `Message ${name}`,
      disclaimer: s.disclaimer ?? `${name} can make mistakes. Check important info.`,
      user,
      initial: user.trim().charAt(0).toUpperCase() || '?',
      accent: s.accent && CSS.supports('color', s.accent) ? s.accent : '',
      logo: s.logo ? String(s.logo) : '' // as written in the config
    };
  });

  locked = $derived(!TAURI && !this.writable);
  saveNote = $derived(
    TAURI
      ? 'Changes are saved in this app and sent to connected phones.'
      : this.writable
        ? 'Changes save to the Mac app and show up on every connected device.'
        : 'The Mac app has phone editing turned off.'
  );
}

export const store = new ConfigStore();

// Saves to the app (null = back to the built-in config). False if it couldn't.
export async function saveConfig(cfg: Config | null): Promise<boolean> {
  store.saving = true;
  try {
    store.rev = await putConfig(cfg);
    return true;
  } catch (e) {
    if (e instanceof HttpError && e.status === 403) store.writable = false;
    ui.toast(`Not saved: ${(e as Error).message || e}. Export to keep your changes.`);
    return false;
  } finally {
    store.saving = false;
    if (store.seenRev > store.rev) onConfigRev(store.seenRev);
  }
}

// Shows a config. `restart` also clears the chat (branding and logo changes don't need to).
// Throws, changing nothing, if the config isn't usable.
export function applyConfig(cfg: Config, restart: boolean) {
  const script = normalizeScript(cfg);
  const threads = normalizeThreads(cfg.threads ?? []);
  store.script = script;
  store.threads = threads;
  store.config = cfg;
  store.pending = null;
  if (restart) chat.reset();
}

export async function setConfig(cfg: Config, restart: boolean, msg?: string) {
  applyConfig(cfg, restart);
  if ((await saveConfig(cfg)) && msg) ui.toast(msg);
}

// Another device (or the app) saved a config: take it now, or after this chat.
async function onConfigRev(rev: number) {
  if (rev <= store.rev) return;
  if (store.saving) {
    store.seenRev = Math.max(store.seenRev, rev);
    return;
  }
  const snap = await fetchConfig().catch(() => null);
  if (!snap || snap.rev <= store.rev) return;
  store.rev = snap.rev;
  store.writable = !!snap.writable;
  if (chat.index === 0 && !chat.busy) {
    try {
      applyConfig(snap.config, true);
      ui.toast('Config updated');
    } catch (e) {
      ui.toast(`The new config is unusable (${(e as Error).message}).`);
    }
  } else {
    store.pending = snap.config;
    ui.toast('Config updated. It loads at the next New chat.');
  }
}

// New chat / Restart script: pick up a config that arrived mid-chat.
export function startOver() {
  if (store.pending) {
    try {
      applyConfig(store.pending, true);
      return;
    } catch {
      store.pending = null;
    }
  }
  chat.reset();
}

export async function boot() {
  watchConfig(onConfigRev); // also catches the app coming back if it can't be reached right now
  let snap;
  try {
    snap = await fetchConfig();
  } catch {
    applyConfig(EMPTY_CONFIG, true);
    ui.toast("Can't reach the FlopGPT app. Check it's running and on the same wifi.");
    return;
  }
  store.rev = snap.rev;
  store.writable = !!snap.writable;
  let cfg = snap.config;
  if (!snap.saved && TAURI) {
    const legacy = takeLegacy(cfg);
    if (legacy && (await saveConfig(legacy))) {
      cfg = legacy;
      ui.toast('Moved your saved script into the app.');
    }
  }
  try {
    applyConfig(cfg, true);
  } catch (e) {
    applyConfig(EMPTY_CONFIG, true);
    ui.toast(`The saved config is unusable (${(e as Error).message}). Import or reset it in Settings.`);
  }
}

/* ---- imports, exports and the logo ---- */

export async function importFiles(files: File[]) {
  for (const file of files) {
    try {
      if (store.locked) throw new Error('The Mac app has phone editing turned off.');
      let raw;
      try {
        raw = JSON.parse(await file.text());
      } catch (e) {
        throw new Error(`${file.name} isn't valid JSON (${(e as Error).message})`);
      }
      const kind = detect(raw);
      if (!kind) throw new Error(`${file.name} doesn't look like a demo config.`);
      const note = kind === 'script' ? ' (kept the old conversations)' : kind === 'threads' ? ' (old conversations only)' : '';
      await setConfig(merge(store.config, raw, kind), kind !== 'threads', `Imported ${file.name}${note}`);
    } catch (e) {
      ui.toast((e as Error).message);
    }
  }
}

/** Dropped files: .json files configure the demo; anything else is attached to the next message. */
export function dropFiles(files: File[]) {
  const json = files.filter(isJson),
    media = files.filter(f => !isJson(f));
  if (json.length) importFiles(json);
  if (media.length) chat.addFiles(media);
}

export async function exportConfig(cfg: Config = store.config) {
  const slug = String(cfg.appName || 'demo').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  try {
    const path = await exportJson((slug || 'demo') + '-config.json', cfg);
    if (path) ui.toast('Exported to ' + path);
  } catch (e) {
    ui.toast(String(e));
  }
}

export async function setLogoFile(file: File) {
  try {
    const logo = await toLogoDataURL(file);
    await setConfig({ ...store.config, logo }, false, 'Logo updated');
  } catch (e) {
    ui.toast((e as Error).message);
  }
}

export function resetLogo() {
  const cfg = { ...store.config };
  delete cfg.logo;
  setConfig(cfg, false, 'Logo reset');
}

export async function resetDefaults() {
  const ok = await ui.confirm('Replace the saved config with the built-in one? Export first if you want to keep it.', 'Reset');
  if (!ok || !(await saveConfig(null))) return;
  try {
    applyConfig((await fetchConfig()).config, true);
    ui.toast('Reset to defaults');
  } catch (e) {
    ui.toast((e as Error).message);
  }
}
