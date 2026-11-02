/** True in the browser-only build (`npm run build:standalone`), which saves its config in localStorage. */
declare const __STANDALONE__: boolean;
/** The app's version, from package.json. */
declare const __APP_VERSION__: string;
interface Window {
  __FLOP_SECTION__?: string | null; // the desktop editor window: which part of the config it opened for (set by open_window)
}
