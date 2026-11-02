/* ------------------------------------------------------------------ *
 *  A config as a .zip: config.json, plus its images as files in assets/.
 *  The config keeps images as data URLs; in the zip, config.json points at
 *  "assets/<file>" instead, as a whole value or inside Markdown ![…](…).
 * ------------------------------------------------------------------ */
import type { Config } from './types';
import { unzip, type ZipEntry } from './unzip';

export const EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/svg+xml': 'svg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'image/x-icon': 'ico',
  'image/vnd.microsoft.icon': 'ico',
};
const MIME: Record<string, string> = {
  ...Object.fromEntries(Object.entries(EXT).map(([mime, ext]) => [ext, mime])),
  jpeg: 'image/jpeg',
  ico: 'image/x-icon',
};

const DATA_URL = /^data:([^;,]*)((?:;[^;,]*)*?)(;base64)?,(.*)$/s;
const MD_DATA = /(!\[[^\]]*\]\()(data:image\/[^)\s]+)(\))/g;
const MD_ASSET = /(!\[[^\]]*\]\()(?:\.\/)?(assets\/[^)\s]+)(\))/g;

function dataToBytes(url: string): { mime: string; data: Uint8Array } | null {
  const m = DATA_URL.exec(url);
  if (!m) return null;
  const mime = m[1] || 'text/plain';
  if (m[3]) return { mime, data: Uint8Array.from(atob(m[4]), c => c.charCodeAt(0)) };
  return { mime, data: new TextEncoder().encode(decodeURIComponent(m[4])) };
}

function bytesToData(data: Uint8Array<ArrayBuffer>, mime: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(new Blob([data], { type: mime }));
  });
}

/** Rebuilds a value, passing each string (and the key path that leads to it) through `fn`. */
function mapStrings(
  v: unknown,
  fn: (s: string, path: (string | number)[]) => string,
  path: (string | number)[] = [],
): unknown {
  if (typeof v === 'string') return fn(v, path);
  if (Array.isArray(v)) return v.map((x, i) => mapStrings(x, fn, [...path, i]));
  if (v && typeof v === 'object')
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, mapStrings(x, fn, [...path, k])]));
  return v;
}

/** The files of a config's .zip: config.json, and each data URL image as a file in assets/. */
export function packConfig(cfg: Config): { name: string; data: Uint8Array }[] {
  const assets = new Map<string, { name: string; data: Uint8Array }>(); // by data URL, so repeats share a file
  const taken = new Set<string>();

  const toAsset = (url: string, path: (string | number)[]): string | null => {
    const known = assets.get(url);
    if (known) return known.name;
    const file = dataToBytes(url);
    if (!file || !file.mime.startsWith('image/')) return null;
    // Named after where it's used: "logo", "responses-3-image" (counting from 1, like the editor).
    const base =
      path
        .map(p => (typeof p === 'number' ? p + 1 : p))
        .join('-')
        .replace(/[^\w-]+/g, '-') || 'image';
    const ext = EXT[file.mime] || 'png';
    let name = `assets/${base}.${ext}`;
    for (let n = 2; taken.has(name); n++) name = `assets/${base}-${n}.${ext}`;
    taken.add(name);
    assets.set(url, { name, data: file.data });
    return name;
  };

  const json = mapStrings(cfg, (s, path) => {
    if (s.startsWith('data:')) return toAsset(s, path) ?? s;
    return s.replace(MD_DATA, (all, open: string, url: string, close: string) => {
      const name = toAsset(url, [...path, 'image']);
      return name ? open + name + close : all;
    });
  });

  return [
    { name: 'config.json', data: new TextEncoder().encode(JSON.stringify(json, null, 2) + '\n') },
    ...assets.values(),
  ];
}

/** Reads a config .zip back: config.json with its assets/ files turned back into data URLs. */
export async function unpackConfig(buf: ArrayBuffer): Promise<{ config: unknown; missing: string[] }> {
  const entries = await unzip(buf);
  // config.json at the top, or in the one folder a zip tool may have wrapped everything in.
  const main = entries
    .filter(e => /(^|\/)config\.json$/i.test(e.name))
    .sort((a, b) => a.name.length - b.name.length)[0];
  if (!main) throw new Error('has no config.json');
  const dir = main.name.slice(0, main.name.length - 'config.json'.length);

  let config: unknown;
  try {
    config = JSON.parse(new TextDecoder().decode(main.data));
  } catch (e) {
    throw new Error(`has a config.json that isn't valid JSON (${(e as Error).message})`, { cause: e });
  }

  const files = new Map<string, ZipEntry>();
  for (const e of entries) if (e.name.startsWith(dir + 'assets/')) files.set(e.name.slice(dir.length), e);
  const urls = new Map<string, string>();
  for (const [name, e] of files) {
    const mime = MIME[name.split('.').pop()!.toLowerCase()] || 'application/octet-stream';
    urls.set(name, await bytesToData(new Uint8Array(e.data), mime));
  }

  const missing = new Set<string>();
  const lookup = (ref: string) => {
    let name = ref.replace(/^\.\//, '');
    try {
      name = decodeURIComponent(name);
    } catch {} // not URL-encoded: use it as it is
    const url = urls.get(name);
    if (!url) missing.add(name);
    return url;
  };
  config = mapStrings(config, s => {
    if (/^(\.\/)?assets\//.test(s)) return lookup(s) ?? s;
    return s.replace(MD_ASSET, (all, open: string, ref: string, close: string) => {
      const url = lookup(ref);
      return url ? open + url + close : all;
    });
  });
  return { config, missing: [...missing] };
}
