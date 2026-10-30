import type { Config, RawPending, RawResponse, Response, Thread } from './types';

export const DEFAULT_SECONDS = 2.5;
export const DEFAULT_TYPING_CPS = 28; // how fast Tab / long-press types the scripted prompt
export const DEFAULT_FALLBACK = "I'm not able to continue this conversation right now. Please start a new chat.";

export const num = <D>(v: unknown, d: D): number | D => {
  const n = parseFloat(String(v));
  return Number.isFinite(n) && n >= 0 ? n : d;
};

export const clone = <T>(o: T): T => JSON.parse(JSON.stringify(o));

export function normalizeScript(raw: unknown): Config {
  if (Array.isArray(raw)) raw = { responses: raw };
  if (!raw || typeof raw !== 'object' || !Array.isArray((raw as Config).responses))
    throw new Error('A script needs a "responses" array.');
  return raw as Config;
}

export function normalizeThreads(raw: unknown): Thread[] {
  const list = Array.isArray(raw) ? raw : (raw as { threads?: unknown })?.threads;
  if (!Array.isArray(list)) throw new Error('Threads need a "threads" array.');
  let group = 'Recent';
  return list.map(t => {
    if (typeof t === 'string') t = { title: t };
    if (t && t.group) group = String(t.group);
    return { title: String((t && (t.title ?? t.name)) ?? 'Untitled'), group };
  });
}

export function normalizeResponse(r: RawResponse | undefined | null, script: Config): Response {
  if (r == null || typeof r !== 'object') r = { response: r == null ? '' : String(r) };
  const fallbackSecs = num(r.defaultPendingSeconds, num(script.defaultPendingSeconds, DEFAULT_SECONDS));
  const raw = r.pending ?? r.thinking ?? r.thoughts ?? [];
  const pending = (Array.isArray(raw) ? raw : [raw])
    .map(p =>
      p && typeof p === 'object'
        ? { text: String(p.text ?? p.label ?? ''), seconds: num(p.seconds ?? p.duration, fallbackSecs) }
        : { text: String(p ?? ''), seconds: fallbackSecs },
    )
    .filter(p => p.text.trim());
  return {
    prompt: typeof r.prompt === 'string' ? r.prompt : '',
    pending,
    text: String(r.response ?? r.text ?? r.message ?? ''),
    stream: r.stream ?? script.streamResponse ?? true,
    cps: num(r.charsPerSecond, num(script.charsPerSecond, 90)) || 90,
  };
}

/** The prompt the performer can auto-type for the response at `index`, if it has one. */
export function promptAt(script: Config, index: number): string {
  const r = script.responses[index];
  return r && typeof r === 'object' && typeof r.prompt === 'string' ? r.prompt : '';
}

/* ------------------------------------------------------------------ *
 *  Imports: what kind of file was dropped, and how it merges in
 * ------------------------------------------------------------------ */
export type ImportKind = 'config' | 'script' | 'threads';

export function detect(raw: unknown): ImportKind | null {
  const o = raw as Record<string, unknown> | null;
  if (o && Array.isArray(o.responses) && Array.isArray(o.threads)) return 'config';
  if (o && Array.isArray(o.responses)) return 'script';
  if (o && Array.isArray(o.threads)) return 'threads';
  if (Array.isArray(raw)) {
    const looksLikeScript = raw.some(
      x => x && typeof x === 'object' && ['response', 'pending', 'thinking', 'text'].some(k => k in x),
    );
    return looksLikeScript ? 'script' : 'threads';
  }
  return null;
}

// Merges an imported file into a config: a full config replaces everything, an old-style
// script keeps the current threads, and a threads list keeps everything else.
export function merge(base: Config, raw: unknown, kind: ImportKind): Config {
  if (kind === 'config') return raw as Config;
  if (kind === 'script') {
    const script = { ...normalizeScript(raw) };
    delete script.threads;
    return { ...script, threads: base.threads ?? [] };
  }
  return { ...base, threads: Array.isArray(raw) ? raw : (raw as Config).threads };
}

/* ------------------------------------------------------------------ *
 *  Editor model
 * ------------------------------------------------------------------ */

/** A thinking step in the editor: `seconds` is the field's text ('' = the default). */
export interface EditStep {
  text: string;
  seconds: string;
}
export type EditResponse = { pending: EditStep[]; response: string; prompt?: string; [key: string]: unknown };
export type EditScript = Omit<Config, 'responses' | 'threads'> & { responses: EditResponse[] };
/** Threads are edited as a flat list of headings ({ group }) and chats ({ title }), like the sidebar. */
export type EditThreadItem = { group: string } | { title: string };
export interface EditData {
  script: EditScript;
  threads: EditThreadItem[];
}

const stepIn = (x: RawPending): EditStep => {
  if (!x || typeof x !== 'object') return { text: String(x ?? ''), seconds: '' };
  const secs = x.seconds ?? x.duration;
  return { text: String(x.text ?? x.label ?? ''), seconds: secs == null ? '' : String(secs) };
};
const stepOut = (s: EditStep): RawPending =>
  s.seconds.trim() === '' ? s.text : { text: s.text, seconds: num(s.seconds, 0) };

// The form edits a tidied copy: every response is an object with a "pending" list and a
// "response"; any other keys are kept as they are.
function editableScript(raw: Config): EditScript {
  const s = clone(normalizeScript(clone(raw)));
  delete s.threads;
  const responses = s.responses.map((r): EditResponse => {
    const o: Record<string, unknown> =
      r == null || typeof r !== 'object' ? { response: r == null ? '' : String(r) } : r;
    const p = (o.pending ?? o.thinking ?? o.thoughts ?? []) as RawPending | RawPending[];
    delete o.thinking;
    delete o.thoughts;
    o.pending = (Array.isArray(p) ? p : [p]).map(stepIn);
    if (o.response == null) o.response = String(o.text ?? o.message ?? '');
    delete o.text;
    delete o.message;
    return o as EditResponse;
  });
  return { ...s, responses };
}

function editableThreads(raw: unknown): EditThreadItem[] {
  const items: EditThreadItem[] = [];
  let g: string | null = null;
  normalizeThreads(raw).forEach(t => {
    if (t.group !== g) items.push({ group: (g = t.group) });
    items.push({ title: t.title });
  });
  return items;
}

function threadsOut(items: EditThreadItem[]) {
  const threads: { title: string; group?: string }[] = [];
  let g: string | null = null;
  items.forEach(it => {
    if ('group' in it) {
      g = it.group;
      return;
    }
    threads.push(g == null ? { title: it.title } : { title: it.title, group: g });
    g = null;
  });
  return threads;
}

export const toEditData = (cfg: Config): EditData => ({
  script: editableScript(cfg),
  threads: editableThreads(cfg.threads ?? []),
});

/** The editor's form contents as config JSON. */
export function fromEditData(data: EditData): Config {
  const s = clone(data.script);
  return {
    ...s,
    responses: s.responses.map(r => ({ ...r, pending: r.pending.map(stepOut) })),
    threads: threadsOut(data.threads),
  };
}

/** Parses and checks the editor's JSON tab. */
export function parseConfigJson(text: string): Config {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    throw new Error('Invalid JSON: ' + (e as Error).message, { cause: e });
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('The config should be a JSON object.');
  normalizeScript(clone(raw)); // these throw if the shape is wrong
  normalizeThreads(clone((raw as Config).threads ?? []));
  return raw as Config;
}

// A blank field removes the key, so the app default applies again.
export const setKey = (o: Record<string, unknown>, k: string, v: unknown) => {
  if (v === '' || v == null) delete o[k];
  else o[k] = v;
};
