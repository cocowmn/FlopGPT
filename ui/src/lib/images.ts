/* ------------------------------------------------------------------ *
 *  The images a config can brand: each is a key holding a URL or data URL.
 *  "logo" came first, so the other logo spots show it until they get their own.
 * ------------------------------------------------------------------ */

export type ImageKey = 'logo' | 'smallLogo' | 'appIcon' | 'favicon' | 'threadAvatar' | 'userAvatar';

export interface ImageSlot {
  key: ImageKey;
  label: string;
  hint: string;
  inherits: boolean; // falls back to "logo" when unset
  maxSize: number; // bitmaps are shrunk to this many px so the config stays small
}

export const IMAGE_SLOTS: ImageSlot[] = [
  { key: 'logo', label: 'Large logo', hint: 'Shown on new threads', inherits: false, maxSize: 256 },
  { key: 'smallLogo', label: 'Small logo', hint: 'Shown in the sidebar', inherits: true, maxSize: 256 },
  { key: 'appIcon', label: 'App icon', hint: 'Shown when saving the app to a device', inherits: true, maxSize: 512 },
  { key: 'favicon', label: 'Favicon', hint: 'Shown in the browser tab', inherits: true, maxSize: 128 },
  {
    key: 'threadAvatar',
    label: 'Thread avatar',
    hint: 'Shown at the end of each AI message',
    inherits: true,
    maxSize: 256,
  },
  { key: 'userAvatar', label: 'User avatar', hint: 'Shown beside your name', inherits: false, maxSize: 256 },
];

export const slotOf = (key: ImageKey) => IMAGE_SLOTS.find(s => s.key === key)!;
