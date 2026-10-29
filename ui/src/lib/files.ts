import { merge } from './normalize';
import type { AttachmentKind, Config } from './types';

export const kindOf = (f: File): AttachmentKind =>
  (/^(image|video|audio)\//.exec(f.type || '')?.[1] as AttachmentKind) || 'file';

export const fmtSize = (b: number) =>
  b < 1024 ? b + ' B' : b < 1048576 ? Math.round(b / 1024) + ' KB' : (b / 1048576).toFixed(1) + ' MB';

export const isJson = (f: File) => /\.json$/i.test(f.name) || f.type === 'application/json';

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

// Shrinks bitmaps to 256px so the config stays small; SVGs are kept as-is.
export function toLogoDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!/^image\//.test(file.type)) return reject(new Error('Please choose an image file.'));
    const fr = new FileReader();
    fr.onerror = () => reject(new Error("Couldn't read that file."));
    fr.onload = () => {
      const data = fr.result as string;
      if (file.type === 'image/svg+xml') return resolve(data);
      const img = new Image();
      img.onerror = () => reject(new Error("Couldn't read that image."));
      img.onload = () => {
        const k = Math.min(1, 256 / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.naturalWidth * k));
        c.height = Math.max(1, Math.round(img.naturalHeight * k));
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/png'));
      };
      img.src = data;
    };
    fr.readAsDataURL(file);
  });
}

const STORE = 'flopgpt.'; // localStorage prefix used before configs were saved in the app

// Before configs lived in the app, the window kept them in localStorage: move them over once.
export function takeLegacy(base: Config): Config | null {
  const read = (k: string) => {
    try {
      const v = JSON.parse(localStorage.getItem(STORE + k) ?? 'null');
      return v && v.data ? v.data : null;
    } catch {
      return null;
    }
  };
  const script = read('script'),
    threads = read('threads'),
    logo = read('logo');
  try {
    ['script', 'threads', 'logo'].forEach(k => localStorage.removeItem(STORE + k));
  } catch {
    /* ignore */
  }
  if (!script && !threads && !logo) return null;
  let cfg = base;
  try {
    if (script) cfg = merge(cfg, script, 'script');
    if (threads) cfg = merge(cfg, threads, 'threads');
  } catch {
    /* unreadable leftovers: skip them */
  }
  return logo ? { ...cfg, logo: String(logo) } : cfg;
}
