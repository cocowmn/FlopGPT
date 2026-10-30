/** A pending ("thinking") blurb as written in a config: a string or { text, seconds }. */
export type RawPending =
  string | { text?: string; label?: string; seconds?: number | string; duration?: number | string };

/** One scripted response as written in a config. A bare string is a response with no blurbs. */
export type RawResponse =
  | string
  | {
      prompt?: string;
      pending?: RawPending | RawPending[];
      thinking?: RawPending | RawPending[];
      thoughts?: RawPending | RawPending[];
      response?: string;
      text?: string;
      message?: string;
      stream?: boolean;
      charsPerSecond?: number | string;
      defaultPendingSeconds?: number | string;
      [key: string]: unknown;
    };

export type RawThread = string | { title?: string; name?: string; group?: string };

/** The whole demo: branding, script settings, responses and the sidebar's old conversations. */
export interface Config {
  responses: RawResponse[];
  threads?: RawThread[];
  appName?: string;
  modelName?: string;
  userName?: string;
  greeting?: string;
  placeholder?: string;
  disclaimer?: string;
  accent?: string;
  logo?: string;
  spinner?: string | string[] | false;
  defaultPendingSeconds?: number | string;
  streamResponse?: boolean;
  charsPerSecond?: number | string;
  typingCharsPerSecond?: number | string;
  thoughtLabel?: string;
  fallback?: RawResponse;
  [key: string]: unknown;
}

/** A response ready to play. */
export interface Response {
  prompt: string;
  pending: { text: string; seconds: number }[];
  text: string;
  stream: boolean;
  cps: number;
}

export interface Thread {
  title: string;
  group: string;
}

export type AttachmentKind = 'image' | 'video' | 'audio' | 'file';

export interface Attachment {
  id: number;
  file: File;
  kind: AttachmentKind;
  url: string;
}

export interface SpinnerDef {
  name: string;
  svg: string;
}

export type SpinnerPick =
  { type: 'none' } | { type: 'logo' } | { type: 'svg'; name: string; html: string; w: number; h: number };

/** What the app answers for the saved config. */
export interface Snapshot {
  rev: number;
  config: Config;
  saved: boolean; // false = the built-in config (nothing saved yet)
  writable: boolean;
}

export interface ServerStatus {
  running: boolean;
  port: number | null;
  configuredPort: number;
  error: string | null;
  localUrl: string | null;
  lanUrls: string[];
  setupUrls: string[]; // HTTPS only: the page where a phone gets the certificate
  requests: number;
  clients: { ip: string; requests: number; lastSeenSecs: number; open: boolean }[];
  phoneEdit: boolean;
  https: boolean;
  certError: string | null;
}
