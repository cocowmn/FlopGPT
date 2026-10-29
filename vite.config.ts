import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// The page is built into dist/, which Tauri loads and the phone server (src-tauri/src/server.rs) embeds.
export default defineConfig({
  root: 'ui',
  base: './',
  plugins: [svelte()],
  clearScreen: false,
  build: { outDir: '../dist', emptyOutDir: true, target: 'es2022' },
  server: {
    port: 5173,
    strictPort: true,
    host: true,
    // A browser on the dev server talks to the running app like a phone would.
    proxy: { '/api': 'http://localhost:8787' }
  }
});
