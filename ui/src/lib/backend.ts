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
  const res = await fetch(API, { cache: 'no-store' });
  if (!res.ok) throw new HttpError('HTTP ' + res.status, res.status);
  return res.json();
}

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
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(json, null, 2) + '\n'], { type: 'application/json' }));
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  return null;
}

/* ---- STANDALONE: the config in this browser's localStorage (other tabs hear saves via `storage` events) ---- */

async function loadLocal(): Promise<Snapshot> {
  let saved: { rev: number; config: Config } | null = null;
  try {
    saved = JSON.parse(localStorage.getItem(KEY) ?? 'null');
  } catch {} // storage blocked, or not JSON: use the built-in config
  if (saved?.config) return { rev: saved.rev, config: saved.config, saved: true, writable: true };
  const builtIn = (await import('../../../src-tauri/default-config.json')).default as Config;
  return { rev: saved?.rev ?? 0, config: builtIn, saved: false, writable: true };
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

/* The LAN server phones connect to (desktop app only). */
export const server = {
  status: () => invoke<ServerStatus>('server_status'),
  start: () => invoke<ServerStatus>('server_start'),
  stop: () => invoke<ServerStatus>('server_stop'),
  setPort: (port: number) => invoke<ServerStatus>('server_set_port', { port }),
  setPhoneEdit: (on: boolean) => invoke<ServerStatus>('server_set_phone_edit', { on }),
  qr: (url: string) => invoke<string>('server_qr', { url }),
};
