/* ------------------------------------------------------------------ *
 *  The desktop app: the window talks to it through Tauri, phones through its server.
 * ------------------------------------------------------------------ */
import { invoke, isTauri } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { Config, ServerStatus, Snapshot } from './types';

export const TAURI = isTauri(); // true only inside the desktop app

const API = '/api/config';

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

/** The app answers with its built-in config until one is saved. */
export async function fetchConfig(): Promise<Snapshot> {
  if (TAURI) return { ...(await invoke<Omit<Snapshot, 'writable'>>('config_load')), writable: true };
  const res = await fetch(API, { cache: 'no-store' });
  if (!res.ok) throw new HttpError('HTTP ' + res.status, res.status);
  return res.json();
}

/** Saves to the app (null = back to the built-in config) and returns the new revision. */
export async function putConfig(cfg: Config | null): Promise<number> {
  if (TAURI) return invoke<number>('config_save', { config: cfg });
  const res = await fetch(API, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config: cfg })
  });
  if (!res.ok) throw new HttpError((await res.text()) || 'HTTP ' + res.status, res.status);
  return (await res.json()).rev;
}

/** Calls `onRev` with the config revision now (phones) and after every save. */
export function watchConfig(onRev: (rev: number) => void) {
  if (TAURI) listen<number>('config-changed', e => onRev(Number(e.payload)));
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

/* The LAN server phones connect to (desktop app only). */
export const server = {
  status: () => invoke<ServerStatus>('server_status'),
  start: () => invoke<ServerStatus>('server_start'),
  stop: () => invoke<ServerStatus>('server_stop'),
  setPort: (port: number) => invoke<ServerStatus>('server_set_port', { port }),
  setPhoneEdit: (on: boolean) => invoke<ServerStatus>('server_set_phone_edit', { on }),
  qr: (url: string) => invoke<string>('server_qr', { url })
};
