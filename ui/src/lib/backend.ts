/* ------------------------------------------------------------------ *
 *  The desktop app: the window talks to it through Tauri, phones through its server.
 *  The browser-only build (STANDALONE) has no app and keeps its config in localStorage.
 * ------------------------------------------------------------------ */
import { invoke, isTauri } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { Config, ServerStatus, Snapshot } from './types';

export const TAURI = isTauri(); // true only inside the desktop app
export const STANDALONE = __STANDALONE__; // true only in the browser-only build

const API = '/api/config';
const KEY = 'flopgpt.config'; // localStorage, STANDALONE only: { rev, config }

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** The app answers with its built-in config until one is saved. */
export async function fetchConfig(): Promise<Snapshot> {
  if (TAURI) return { ...(await invoke<Omit<Snapshot, 'writable'>>('config_load')), writable: true };
  if (STANDALONE) return loadLocal();
  // The page stays blank until this answers, so give up on an unreachable app rather than hang.
  const res = await fetch(API, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new HttpError('HTTP ' + res.status, res.status);
  const snap: Snapshot = await res.json();
  keepLast(snap);
  return snap;
}

/** The config the app ships with (the same file the app answers with until one is saved). */
export const builtInConfig = async (): Promise<Config> =>
  (await import('../../../src-tauri/default-config.json')).default as Config;

/** Saves to the app (null = back to the built-in config) and returns the new revision. */
export async function putConfig(cfg: Config | null): Promise<number> {
  if (TAURI) return invoke<number>('config_save', { config: cfg });
  if (STANDALONE) return saveLocal(cfg);
  const res = await fetch(API, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config: cfg }),
  });
  if (!res.ok) throw new HttpError((await res.text()) || 'HTTP ' + res.status, res.status);
  return (await res.json()).rev;
}

/** Calls `onRev` with the config revision now (phones) and after every save. */
export function watchConfig(onRev: (rev: number) => void) {
  if (TAURI) listen<number>('config-changed', e => onRev(Number(e.payload)));
  else if (STANDALONE)
    addEventListener('storage', e => e.key === KEY && onRev(e.newValue ? JSON.parse(e.newValue).rev : Date.now()));
  else if (window.EventSource) new EventSource('/api/events').onmessage = e => onRev(Number(e.data));
}

/** Asks where to save (desktop) or downloads the file (phones). Returns the path, if any. */
export async function exportJson(name: string, json: unknown): Promise<string | null> {
  if (TAURI) return invoke<string | null>('export_json', { name, json });
  download(name, new Blob([JSON.stringify(json, null, 2) + '\n'], { type: 'application/json' }));
  return null;
}

/** Same, for a .zip. */
export async function exportZip(name: string, bytes: Uint8Array<ArrayBuffer>): Promise<string | null> {
  if (TAURI) return invoke<string | null>('export_zip', { name, bytes: Array.from(bytes) });
  download(name, new Blob([bytes], { type: 'application/zip' }));
  return null;
}

function download(name: string, blob: Blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ---- STANDALONE: the config in this browser's localStorage (other tabs hear saves via `storage` events) ---- */

async function loadLocal(): Promise<Snapshot> {
  let saved: { rev: number; config: Config } | null = null;
  try {
    saved = JSON.parse(localStorage.getItem(KEY) ?? 'null');
  } catch {} // storage blocked, or not JSON: use the built-in config
  if (saved?.config) return { rev: saved.rev, config: saved.config, saved: true, writable: true };
  return { rev: saved?.rev ?? 0, config: await builtInConfig(), saved: false, writable: true };
}

function saveLocal(cfg: Config | null): number {
  const rev = Date.now();
  try {
    // A reset keeps the rev so other tabs still see a newer revision.
    localStorage.setItem(KEY, JSON.stringify(cfg ? { rev, config: cfg } : { rev }));
  } catch (e) {
    throw new Error(
      (e as Error).name === 'QuotaExceededError'
        ? "it's too big for this browser's storage (try a smaller logo)"
        : "this browser won't let the page save",
      { cause: e },
    );
  }
  return rev;
}

/* ---- Phones: the last config the app sent, so the installed app still works when it can't reach it ---- */

const LAST_CACHE = 'flopgpt-brand'; // shared with ui/sw.js, which keeps it across app updates
const LAST_KEY = './last-config.json'; // never fetched: the page reads it straight from the cache

function keepLast(snap: Snapshot) {
  if (!('caches' in window)) return; // only on HTTPS, which is also the only way the page loads offline
  const body = JSON.stringify({ rev: snap.rev, config: snap.config });
  caches
    .open(LAST_CACHE)
    .then(c => c.put(LAST_KEY, new Response(body, { headers: { 'Content-Type': 'application/json' } })))
    .catch(() => {}); // storage full or blocked: there's just nothing to fall back on
}

/** The config the app last sent this phone, if any. */
export async function lastConfig(): Promise<{ rev: number; config: Config } | null> {
  if (TAURI || STANDALONE || !('caches' in window)) return null;
  try {
    const hit = await (await caches.open(LAST_CACHE)).match(LAST_KEY);
    return hit ? await hit.json() : null;
  } catch {
    return null;
  }
}

/* The LAN server phones connect to (desktop app only). */
export const server = {
  status: () => invoke<ServerStatus>('server_status'),
  start: () => invoke<ServerStatus>('server_start'),
  stop: () => invoke<ServerStatus>('server_stop'),
  setPort: (port: number) => invoke<ServerStatus>('server_set_port', { port }),
  setPhoneEdit: (on: boolean) => invoke<ServerStatus>('server_set_phone_edit', { on }),
  setHttps: (on: boolean) => invoke<ServerStatus>('server_set_https', { on }),
  resetCert: () => invoke<ServerStatus>('server_reset_cert'),
  qr: (url: string) => invoke<string>('server_qr', { url }),
};
