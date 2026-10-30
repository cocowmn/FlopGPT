import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import svelte from 'eslint-plugin-svelte';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';

export default defineConfig(
  globalIgnores(['dist/', 'dist-web/', '.vercel/', 'src-tauri/']),
  js.configs.recommended,
  ts.configs.recommended,
  svelte.configs.recommended,
  prettier,
  svelte.configs.prettier,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    // `catch {} // why` is how this codebase ignores errors on purpose.
    rules: { 'no-empty': ['error', { allowEmptyCatch: true }] },
  },
  {
    files: ['**/*.svelte', '**/*.svelte.ts'],
    languageOptions: { parserOptions: { parser: ts.parser } },
  },
  {
    files: ['ui/sw.js'],
    languageOptions: { globals: { ...globals.serviceworker, __FILES__: 'readonly' } }, // filled in by vite.config.ts
  },
);
