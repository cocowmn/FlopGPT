import { svelte } from '@sveltejs/vite-plugin-svelte';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';

// The page is built into dist/, which Tauri loads and the phone server (src-tauri/src/server.rs) embeds.
// `--mode standalone` builds a browser-only copy into dist-web/ that keeps its config in localStorage.
export default defineConfig(({ mode }) => {
  const standalone = mode === 'standalone';
  return {
    root: 'ui',
    base: './',
    plugins: [svelte(), serviceWorker()],
    clearScreen: false,
    define: { __STANDALONE__: JSON.stringify(standalone) },
    build: { outDir: standalone ? '../dist-web' : '../dist', emptyOutDir: true, target: 'es2022' },
    server: {
      port: 5173,
      strictPort: true,
      host: true,
      // A browser on the dev server talks to the running app like a phone would.
      proxy: { '/api': 'http://localhost:8787' },
    },
  };
});

// Emits ui/sw.js as sw.js with the build's files to cache and a version that changes with them.
function serviceWorker(): Plugin {
  return {
    name: 'service-worker',
    apply: 'build',
    generateBundle(_, bundle) {
      const pub = readdirSync('ui/public').filter(f => !f.startsWith('.'));
      const files = [...new Set(['index.html', ...Object.keys(bundle), ...pub])].sort();
      const hash = createHash('sha256').update(files.join('\n'));
      for (const f of pub) hash.update(readFileSync(`ui/public/${f}`));
      const source = readFileSync('ui/sw.js', 'utf8')
        .replace("'__VERSION__'", JSON.stringify(hash.digest('hex').slice(0, 12)))
        .replace('__FILES__', JSON.stringify(files));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}
