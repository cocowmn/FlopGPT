import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// The page is built into dist/, which Tauri loads and the phone server (src-tauri/src/server.rs) embeds.
// `--mode standalone` builds a browser-only copy into dist-web/ that keeps its config in localStorage.
export default defineConfig(({ mode }) => {
  const standalone = mode === 'standalone';
  return {
    root: 'ui',
    base: './',
    plugins: [svelte()],
    clearScreen: false,
    define: { __STANDALONE__: JSON.stringify(standalone) },
    build: { outDir: standalone ? '../dist-web' : '../dist', emptyOutDir: true, target: 'es2022' },
    server: {
      port: 5173,
      strictPort: true,
      host: true,
      // A browser on the dev server talks to the running app like a phone would.
      proxy: { '/api': 'http://localhost:8787' }
    }
  };
});
