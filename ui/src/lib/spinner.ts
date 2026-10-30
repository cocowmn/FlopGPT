import { SPINNERS } from './spinners';
import type { Config, SpinnerDef, SpinnerPick } from './types';

let seq = 0;

// Drop the root fill (the CSS colors it) and give ids/animation names a unique suffix so
// two copies on the page never clash.
function build(s: SpinnerDef): SpinnerPick {
  const n = ++seq;
  let svg = s.svg.trim().replace(/^(<svg\b[^>]*?)\sfill="[^"]*"/, '$1');
  [...svg.matchAll(/\bid="([^"]+)"/g)]
    .map(m => m[1])
    .forEach(id => {
      svg = svg.split(id).join(id + '_' + n);
    });
  const vb = ((svg.match(/viewBox="([^"]+)"/) || [])[1] || '')
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  const ratio = vb[2] > 0 && vb[3] > 0 ? vb[2] / vb[3] : 1;
  const h = ratio > 3 ? 64 / ratio : 24; // very wide ones (the gooey one) get a fixed width instead
  return { type: 'svg', name: s.name, html: svg, w: +(h * ratio).toFixed(1), h: +h.toFixed(1) };
}

let last = ''; // so the same spinner doesn't appear twice in a row

// script option "spinner": "random" (default) | "none" | "3-dots-bounce" | ["name", "name"]
export function pickSpinner(script: Config): SpinnerPick {
  const opt = script.spinner ?? 'random';
  if (opt === 'none' || opt === false) return { type: 'none' };
  let pool = SPINNERS;
  if (Array.isArray(opt)) pool = SPINNERS.filter(s => opt.includes(s.name));
  else if (typeof opt === 'string' && opt !== 'random') pool = SPINNERS.filter(s => s.name === opt);
  if (!pool.length) return { type: 'logo' }; // no spinners available: pulse the sparkle instead
  if (pool.length > 1) pool = pool.filter(s => s.name !== last);
  const s = pool[Math.floor(Math.random() * pool.length)];
  last = s.name;
  return build(s);
}
