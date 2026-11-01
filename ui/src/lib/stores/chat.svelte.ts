import { kindOf } from '../files';
import { DEFAULT_FALLBACK, DEFAULT_TYPING_CPS, normalizeResponse, num, promptAt } from '../normalize';
import { pickSpinner } from '../spinner';
import type { Attachment, Response, SpinnerPick } from '../types';
import { store } from './config.svelte';
import { ui } from './ui.svelte';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
export const MAX_ATTACHMENTS = 10;

export interface Thinking {
  steps: string[];
  label: string; // the step on screen now, then the "Thought for Ns" label
  done: boolean;
  spinner: SpinnerPick;
}

export type Message =
  | { id: number; role: 'user'; text: string; atts: Attachment[] }
  | {
      id: number;
      role: 'assistant';
      thinking: Thinking | null;
      writing: boolean; // the reply text has started
      shown: string; // how much of the reply is on screen
      complete: boolean; // all of it is (no more streaming)
      full: string;
      instant?: boolean; // restored by a jump: skip the entrance animations
    };
export type AssistantMessage = Extract<Message, { role: 'assistant' }>;

let ids = 0;

class Chat {
  messages = $state<Message[]>([]);
  input = $state('');
  attachments = $state<Attachment[]>([]);
  index = $state(0); // which scripted response comes next
  busy = $state(false); // a response is currently playing
  typing = $state(false); // the scripted prompt is being auto-typed
  private run = 0; // bumped to cancel an in-flight response
  private typeTimer = 0;
  private sentUrls: string[] = []; // object URLs of files already sent (revoked on reset)

  nextPrompt = $derived(promptAt(store.script, this.index));
  canSend = $derived(!this.busy && !this.typing && !!(this.input.trim() || this.nextPrompt || this.attachments.length));

  /* ---- the + button, paste and drop all feed the tray ---- */
  addFiles(files: Iterable<File>) {
    for (const file of files) {
      if (this.attachments.length >= MAX_ATTACHMENTS) {
        ui.toast(`You can attach up to ${MAX_ATTACHMENTS} files.`);
        break;
      }
      this.attachments.push({
        id: ++ids,
        file,
        kind: kindOf(file),
        url: URL.createObjectURL(file),
      });
    }
  }

  removeAttachment(a: Attachment) {
    URL.revokeObjectURL(a.url);
    this.attachments = this.attachments.filter(x => x.id !== a.id);
  }

  submit() {
    if (this.busy || this.typing) return;
    const text = this.input.trim() || this.nextPrompt; // empty + Enter sends the scripted prompt, if any
    if (!text && !this.attachments.length) return;
    const script = store.script;
    const r = script.responses[this.index];
    const resp = normalizeResponse(r !== undefined ? r : (script.fallback ?? DEFAULT_FALLBACK), script);
    this.index++;
    this.input = '';
    const atts = this.attachments;
    this.attachments = [];
    this.sentUrls.push(...atts.map(a => a.url));
    this.messages.push({ id: ++ids, role: 'user', text, atts });
    ui.pinned = true;
    ui.stick();
    this.play(resp);
  }

  private async play(resp: Response) {
    const run = ++this.run;
    const live = () => run === this.run;
    this.busy = true;

    this.messages.push({
      id: ++ids,
      role: 'assistant',
      thinking: null,
      writing: false,
      shown: '',
      complete: false,
      full: resp.text,
    });
    const msg = this.messages[this.messages.length - 1] as AssistantMessage; // the reactive copy

    if (resp.pending.length) {
      msg.thinking = {
        steps: [],
        label: '',
        done: false,
        spinner: pickSpinner(store.script),
      };
      const thinking = msg.thinking!; // the reactive copy
      const t0 = performance.now();
      for (const p of resp.pending) {
        thinking.steps.push(p.text);
        thinking.label = p.text;
        ui.stick();
        await sleep(p.seconds * 1000);
        if (!live()) return;
      }
      const secs = Math.max(1, Math.round((performance.now() - t0) / 1000));
      thinking.done = true;
      thinking.label = (store.script.thoughtLabel || 'Thought for {s}s').replace('{s}', String(secs));
    }

    msg.writing = true;
    if (resp.stream && resp.text) await this.stream(msg, resp.cps, live);
    if (!live()) return;
    msg.shown = resp.text;
    msg.complete = true;
    this.busy = false;
    ui.stick();
  }

  private stream(msg: AssistantMessage, cps: number, live: () => boolean) {
    const text = msg.full;
    return new Promise<void>(resolve => {
      const t0 = performance.now();
      const frame = (now: number) => {
        if (!live()) return resolve();
        let n = Math.floor(((now - t0) / 1000) * cps);
        if (n >= text.length) return resolve();
        while (n < text.length && !/\s/.test(text[n])) n++; // reveal whole words
        if (n !== msg.shown.length) {
          msg.shown = text.slice(0, n);
          ui.stick();
        }
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
  }

  /** Stops whatever is playing or being typed. */
  private halt() {
    this.run++;
    this.busy = false;
    this.stopTyping();
  }

  private forget(msgs: Message[]) {
    const urls = msgs.flatMap(m => (m.role === 'user' ? m.atts.map(a => a.url) : []));
    urls.forEach(u => URL.revokeObjectURL(u));
    this.sentUrls = this.sentUrls.filter(u => !urls.includes(u));
  }

  /** Unsends the last prompt and removes its reply, finished or still playing. */
  undo() {
    const at = this.messages.map(m => m.role).lastIndexOf('user');
    if (at < 0) return;
    this.halt();
    const removed = this.messages.splice(at);
    this.forget(removed);
    const first = removed[0];
    this.index = Math.max(0, this.index - 1);
    this.input = first.role === 'user' ? first.text : '';
    ui.pinned = true;
    ui.stick();
    ui.focusComposer();
  }

  /** The scripted responses, for the jump list. */
  get turns() {
    const script = store.script;
    return script.responses.map((r, i) => {
      const resp = normalizeResponse(r, script);
      const line = resp.text.split('\n').map(l => l.replace(/^[\s#>*\-_`]+|[*_`]+/g, '').trim()).find(Boolean);
      return { n: i + 1, label: resp.prompt || line || '(empty)' };
    });
  }

  /** Shows the conversation as it stands after `n` responses, with no animation. */
  jumpTo(n: number) {
    this.halt();
    const script = store.script;
    // Keep real turns (typed text, attachments) that are already on screen; build the rest from the script.
    let turns = 0;
    let keep = 0;
    this.messages.forEach((m, i) => {
      if (m.role === 'assistant' && m.complete && turns < n) {
        turns++;
        keep = i + 1;
      }
    });
    this.forget(this.messages.splice(keep));
    for (const m of this.messages) if (m.role === 'assistant') m.instant = true;
    for (let i = turns; i < n; i++) {
      const resp = normalizeResponse(script.responses[i], script);
      const secs = Math.max(1, Math.round(resp.pending.reduce((t, p) => t + p.seconds, 0)));
      this.messages.push({ id: ++ids, role: 'user', text: resp.prompt, atts: [] });
      this.messages.push({
        id: ++ids,
        role: 'assistant',
        thinking: resp.pending.length
          ? {
              steps: resp.pending.map(p => p.text),
              label: (script.thoughtLabel || 'Thought for {s}s').replace('{s}', String(secs)),
              done: true,
              spinner: pickSpinner(script),
            }
          : null,
        writing: true,
        shown: resp.text,
        complete: true,
        full: resp.text,
        instant: true,
      });
    }
    this.index = n;
    this.input = '';
    ui.pinned = true;
    ui.stick();
  }

  // Tab (or a long-press) on an empty box "types" the scripted prompt.
  autoType(text = this.nextPrompt) {
    if (!text || this.typing) return;
    const cps = num(store.script.typingCharsPerSecond, DEFAULT_TYPING_CPS) || DEFAULT_TYPING_CPS;
    // When each character is due: the average gap, give or take up to half, so it looks typed.
    let t = performance.now();
    const due = Array.from({ length: text.length }, () => (t += (1000 / cps) * (0.25 + Math.random())));
    this.input = '';
    this.typing = true;
    let n = 0;
    // Types every character that's due, so high speeds aren't capped by how often timers fire.
    const step = () => {
      const now = performance.now();
      while (n < due.length && due[n] <= now) n++;
      this.input = text.slice(0, n);
      if (n >= text.length) return this.stopTyping();
      this.typeTimer = window.setTimeout(step, Math.max(4, due[n] - now));
    };
    this.typeTimer = window.setTimeout(step, due[0] - performance.now());
  }

  private stopTyping() {
    clearTimeout(this.typeTimer);
    this.typing = false;
  }

  reset() {
    this.run++;
    this.busy = false;
    this.index = 0;
    this.stopTyping();
    this.messages = [];
    this.sentUrls.forEach(u => URL.revokeObjectURL(u));
    this.sentUrls = [];
    this.attachments.forEach(a => URL.revokeObjectURL(a.url));
    this.attachments = [];
    this.input = '';
    ui.activeThread = -1;
    ui.pinned = true;
    ui.focusComposer();
  }
}

export const chat = new Chat();
