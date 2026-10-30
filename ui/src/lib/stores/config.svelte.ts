/* ------------------------------------------------------------------ *
 *  Config: one JSON (script settings, responses and threads) saved by the desktop app.
 *  The app window reads and saves it through Tauri; phones through the app's server;
 *  the browser-only build in localStorage.
 * ------------------------------------------------------------------ */
import { exportJson, exportZip, fetchConfig, HttpError, putConfig, STANDALONE, TAURI, watchConfig } from '../backend';
import { isJson, takeLegacy, toImageDataURL } from '../files';
import { IMAGE_SLOTS, slotOf, type ImageKey } from '../images';
import { abs } from '../location';
import { appIconPng, DEFAULT_ACCENT, SPARKLE, toHex } from '../pwa';
import { zip } from '../zip';
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
    const name = s.appName || 'FlopGPT';
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
    };
  });

  // Each image spot: its own image (as written in the config), and the full URL to show ('' = the default).
  // `false` keeps a spot on its default instead of the large logo.
  images = $derived.by(() => {
    const s = this.script;
    const own = (k: ImageKey) => (s[k] ? String(s[k]) : '');
    const out = {} as Record<ImageKey, { own: string; src: string; inherited: boolean; optedOut: boolean }>;
    for (const slot of IMAGE_SLOTS) {
      const mine = own(slot.key);
      const optedOut = slot.inherits && s[slot.key] === false;
      const raw = mine || (slot.inherits && !optedOut ? own('logo') : '');
      out[slot.key] = { own: mine, src: raw ? abs(raw) : '', inherited: !mine && !!raw, optedOut };
    }
    return out;
  });

  locked = $derived(!TAURI && !STANDALONE && !this.writable);
  saveNote = $derived(
    TAURI
      ? 'Changes are saved in this app and sent to connected phones.'
      : STANDALONE
        ? 'Changes are saved in this browser only. Export to move them to another device.'
        : this.writable
          ? 'Changes save to the Mac app and show up on every connected device.'
          : 'The Mac app has phone editing turned off.',
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
    ui.toast(
      STANDALONE
        ? "Couldn't load the config."
        : "Can't reach the FlopGPT app. Check it's running and on the same wifi.",
    );
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
    ui.toast(`The saved config is unusable (${(e as Error).message}). import or reset it in Settings.`);
  }
}

/* ---- imports, exports and images ---- */

export async function importFiles(files: File[]) {
  for (const file of files) {
    try {
      if (store.locked) throw new Error('The Mac app has phone editing turned off.');
      let raw;
      try {
        raw = JSON.parse(await file.text());
      } catch (e) {
        throw new Error(`${file.name} isn't valid JSON (${(e as Error).message})`, { cause: e });
      }
      const kind = detect(raw);
      if (!kind) throw new Error(`${file.name} doesn't look like a demo config.`);
      const note =
        kind === 'script' ? ' (kept the old conversations)' : kind === 'threads' ? ' (old conversations only)' : '';
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

const slug = (name: unknown) =>
  String(name || 'demo')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'demo';

export async function exportConfig(cfg: Config = store.config) {
  try {
    const path = await exportJson(slug(cfg.appName) + '-config.json', cfg);
    if (path) ui.toast('Exported to ' + path);
  } catch (e) {
    ui.toast(String(e));
  }
}

export async function setImageFile(key: ImageKey, file: File) {
  const slot = slotOf(key);
  try {
    const data = await toImageDataURL(file, slot.maxSize);
    await setConfig({ ...store.config, [key]: data }, false, `${slot.label} updated`);
  } catch (e) {
    ui.toast((e as Error).message);
  }
}

export function resetImages(keys: ImageKey[]) {
  const cfg = { ...store.config };
  for (const k of keys) delete cfg[k];
  setConfig(cfg, false, keys.length === 1 ? `${slotOf(keys[0]).label} reset` : 'Images reset');
}

const EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/svg+xml': 'svg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'image/x-icon': 'ico',
  'image/vnd.microsoft.icon': 'ico',
};

/** Every image as the app shows it right now, the built-in ones included, in one .zip. */
export async function exportImages() {
  const accent = toHex(store.brand.accent || DEFAULT_ACCENT);
  const svg = (body: string, box: number) =>
    new Blob([`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${box} ${box}">${body}</svg>\n`], {
      type: 'image/svg+xml',
    });
  const sparkle = (fill: string) => svg(`<path fill="${fill}" d="${SPARKLE}"/>`, 24);
  // The built-in look of each spot (see global.css and index.html). The user's initial isn't an image: left out.
  const builtIn: Record<Exclude<ImageKey, 'appIcon'>, () => Blob | null> = {
    logo: () =>
      svg(
        `<circle cx="26" cy="26" r="26" fill="${accent}"/>` +
          `<path fill="#fff" transform="translate(13 13) scale(${26 / 24})" d="${SPARKLE}"/>`,
        52,
      ),
    smallLogo: () => sparkle(accent),
    favicon: () => sparkle(DEFAULT_ACCENT),
    threadAvatar: () => sparkle(accent),
    userAvatar: () => null,
  };

  const missed: string[] = [],
    dropped: string[] = [];
  try {
    const files = await Promise.all(
      IMAGE_SLOTS.map(async slot => {
        const key = slot.key;
        const src = shown(store.images[key].src);
        let blob: Blob | null;
        if (key === 'appIcon') {
          // Drawn the way it's installed, built-in or not.
          const img = store.images.appIcon;
          blob = await appIconPng({
            name: store.brand.name,
            accent: store.brand.accent,
            logo: src,
            fullBleed: !img.inherited,
          });
        } else if (!src) {
          blob = builtIn[key]();
        } else {
          blob = await fetch(src)
            .then(r => (r.ok ? r.blob() : Promise.reject()))
            .catch(() => {
              const fallback = builtIn[key]();
              (fallback ? missed : dropped).push(slot.label.toLowerCase());
              return fallback;
            });
        }
        if (!blob) return null;
        const ext = EXT[blob.type] || /\.(\w{2,4})(?:[?#]|$)/.exec(src)?.[1] || 'png';
        return { name: `${slug(slot.label)}.${ext}`, data: new Uint8Array(await blob.arrayBuffer()) };
      }),
    );
    const path = await exportZip(slug(store.brand.name) + '-images.zip', zip(files.filter(f => !!f)));
    const notes = [
      missed.length && `Couldn't fetch the ${missed.join(', ')}, so the default is in the zip.`,
      dropped.length && `Couldn't fetch the ${dropped.join(', ')}, so it's not in the zip.`,
    ].filter(Boolean);
    if (notes.length) ui.toast(notes.join(' '));
    else if (path) ui.toast('Exported to ' + path);
  } catch (e) {
    ui.toast(`Couldn't make the zip (${(e as Error).message || e}).`);
  }
}

/** Whether a spot without its own image shows the large logo, or its default. */
export function useLargeLogo(key: ImageKey, on: boolean) {
  const cfg: Config = { ...store.config, [key]: false };
  if (on) delete cfg[key];
  setConfig(cfg, false, `${slotOf(key).label} ${on ? 'uses the large logo' : 'uses its default'}`);
}

/** The src to draw, or '' if it's empty or wouldn't load. */
export const shown = (src: string) => (src && !ui.failedImages.has(src) ? src : '');

export function imageFailed(key: ImageKey, src: string) {
  if (ui.failedImages.has(src)) return;
  ui.failedImages.add(src);
  ui.toast(`Couldn't load the ${slotOf(key).label.toLowerCase()} image, so the default is shown.`);
}

export async function resetDefaults() {
  const ok = await ui.confirm(
    'Replace the saved config with the built-in one? Export first if you want to keep it.',
    'Reset',
  );
  if (!ok || !(await saveConfig(null))) return;
  try {
    applyConfig((await fetchConfig()).config, true);
    ui.toast('Reset to defaults');
  } catch (e) {
    ui.toast((e as Error).message);
  }
}
