/* ------------------------------------------------------------------ *
 *  Installing the page as an app (PWA), branded from the config.
 *  The service worker (ui/sw.js) only runs on HTTPS or localhost, so the phone server
 *  (plain HTTP on the wifi) gets just the head tags: enough for iOS "Add to Home Screen".
 *  The worker can't see the config, so the page renders the manifest and icons into
 *  a cache it serves them from.
 * ------------------------------------------------------------------ */
import { TAURI } from './backend';

const BRAND_CACHE = 'flopgpt-brand'; // shared with ui/sw.js
const SPARKLE = 'M12 2c.6 4.6 2.4 8.4 10 10-7.6 1.6-9.4 5.4-10 10-.6-4.6-2.4-8.4-10-10 7.6-1.6 9.4-5.4 10-10z'; // #i-logo
const DEFAULT_ACCENT = '#5b5bd6'; // --accent in global.css

const WORKER = import.meta.env.PROD && !TAURI && isSecureContext && 'serviceWorker' in navigator;

export function registerWorker() {
  if (WORKER) navigator.serviceWorker.register('./sw.js').catch(() => {}); // offline/install is a bonus
}

export interface AppBrand {
  name: string;
  accent: string; // any CSS color, '' for the default
  logo: string; // full URL, '' for the sparkle
}

let timer: ReturnType<typeof setTimeout> | undefined;
let latest = 0;

/** Points the install name, icon and theme color at the brand. Debounced: the accent picker fires often. */
export function brandApp(b: AppBrand) {
  if (TAURI) return;
  clearTimeout(timer);
  timer = setTimeout(() => apply(b, ++latest), 300);
}

async function apply(b: AppBrand, run: number) {
  const color = toHex(b.accent || DEFAULT_ACCENT);
  meta('theme-color').content = color;
  meta('apple-mobile-web-app-title').content = b.name;
  const logo = b.logo ? await loadImage(b.logo).catch(() => null) : null;
  if (run !== latest) return;
  let icons;
  try {
    icons = [180, 192, 512].map(size => drawIcon(size, color, logo));
    icons[0].toDataURL(); // throws if a cross-origin logo tainted the canvas
  } catch {
    icons = [180, 192, 512].map(size => drawIcon(size, color, null));
  }
  (document.getElementById('touch-icon') as HTMLLinkElement).href = icons[0].toDataURL('image/png');
  if (!WORKER) return;
  try {
    const cache = await caches.open(BRAND_CACHE);
    const manifest = {
      id: './',
      name: b.name,
      short_name: b.name,
      start_url: './',
      scope: './',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: color,
      icons: [192, 512].map(size => ({
        src: `brand-${size}.png`,
        sizes: `${size}x${size}`,
        type: 'image/png',
        purpose: 'any maskable',
      })),
    };
    await Promise.all([
      cache.put(
        'manifest.webmanifest',
        new Response(JSON.stringify(manifest), { headers: { 'Content-Type': 'application/manifest+json' } }),
      ),
      ...[192, 512].map(async (size, i) => {
        const png = await new Promise<Blob | null>(r => icons[i + 1].toBlob(r, 'image/png'));
        if (png) await cache.put(`brand-${size}.png`, new Response(png, { headers: { 'Content-Type': 'image/png' } }));
      }),
    ]);
    if (run === latest) reloadManifest();
  } catch {} // storage full or blocked: the worker serves the built-in manifest
}

// Browsers read the manifest once per page, so a new name only reaches "Install" or "Add to Home Screen"
// if the link changes. Also redone when the worker takes over: before that the built-in manifest was read.
let manifestRev = 0;
function reloadManifest() {
  const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (link) link.href = `./manifest.webmanifest?v=${++manifestRev}`;
}
if (WORKER) navigator.serviceWorker.addEventListener('controllerchange', reloadManifest);

/** A square, full-bleed icon: the logo on white, or the sparkle on the accent. Content stays in the maskable safe zone. */
function drawIcon(size: number, color: string, logo: HTMLImageElement | null) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = logo ? '#ffffff' : color;
  ctx.fillRect(0, 0, size, size);
  const box = size * 0.6;
  if (logo) {
    const w = logo.naturalWidth || 1,
      h = logo.naturalHeight || 1; // an SVG without a size draws square
    const k = box / Math.max(w, h);
    ctx.drawImage(logo, (size - w * k) / 2, (size - h * k) / 2, w * k, h * k);
  } else {
    ctx.translate((size - box) / 2, (size - box) / 2);
    ctx.scale(box / 24, box / 24);
    ctx.fillStyle = '#ffffff';
    ctx.fill(new Path2D(SPARKLE));
  }
  return c;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // lets a logo on another site draw untainted if it allows it
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Any CSS color as hex (canvas normalizes it), for manifests that only read simple colors. */
function toHex(color: string) {
  const ctx = document.createElement('canvas').getContext('2d')!;
  ctx.fillStyle = DEFAULT_ACCENT;
  ctx.fillStyle = color; // ignored if unparseable
  return String(ctx.fillStyle);
}

function meta(name: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.name = name;
    document.head.append(el);
  }
  return el;
}
