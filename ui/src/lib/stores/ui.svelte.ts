import { tick } from 'svelte';
import { MediaQuery } from 'svelte/reactivity';

export const wide = new MediaQuery('min-width: 900px');
export const reduceMotion = new MediaQuery('prefers-reduced-motion: reduce');

interface ConfirmRequest {
  message: string;
  ok: string;
  resolve: (yes: boolean) => void;
}

class UI {
  sidebarOpen = $state(false);
  search = $state('');
  activeThread = $state(-1); // highlighted old thread (cosmetic only)
  settingsOpen = $state(false);
  editorOpen = $state(false);
  lightbox = $state<{ src: string; alt: string } | null>(null);
  confirmReq = $state<ConfirmRequest | null>(null);
  toastMsg = $state('');
  toastShown = $state(false);
  logoFailedFor = $state(''); // a logo src that wouldn't load; the sparkle shows instead
  pinned = true; // keep the chat scrolled to the bottom

  private toastTimer = 0;
  private scrollFn: (() => void) | null = null;
  private focusFn: (() => void) | null = null;

  toast(msg: string) {
    this.toastMsg = msg;
    this.toastShown = true;
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => (this.toastShown = false), 4000);
  }

  /** An in-app stand-in for confirm(). */
  confirm(message: string, ok = 'OK'): Promise<boolean> {
    this.confirmReq?.resolve(false);
    return new Promise(resolve => (this.confirmReq = { message, ok, resolve }));
  }

  closeSidebarIfNarrow() {
    if (!wide.current) this.sidebarOpen = false;
  }

  /* The chat view and composer register these so the stores can ask for them. */
  onScroll(fn: () => void) {
    this.scrollFn = fn;
  }
  onFocusComposer(fn: () => void) {
    this.focusFn = fn;
  }

  /** Scrolls to the bottom (after the DOM has updated) unless the reader scrolled up. */
  stick() {
    tick().then(() => {
      if (this.pinned) this.scrollFn?.();
    });
  }

  focusComposer() {
    if (wide.current) tick().then(() => this.focusFn?.());
  }
}

export const ui = new UI();
