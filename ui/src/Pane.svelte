<!-- The desktop app's Settings and editor windows: that one dialog, filling the window, with what it pops up. -->
<script lang="ts">
  import { getCurrentWindow } from '@tauri-apps/api/window';
  import { onMount } from 'svelte';
  import ConfirmDialog from './components/ConfirmDialog.svelte';
  import EditorDialog from './components/editor/EditorDialog.svelte';
  import { ed, openEditor } from './components/editor/editor.svelte';
  import IconSprite from './components/IconSprite.svelte';
  import Lightbox from './components/Lightbox.svelte';
  import SettingsDialog from './components/settings/SettingsDialog.svelte';
  import Toast from './components/Toast.svelte';
  import { isConfigFile } from './lib/files';
  import { openLinksExternally, WINDOW } from './lib/backend';
  import type { Section } from './lib/normalize';
  import { bootWindow, flushField, importFiles, store } from './lib/stores/config.svelte';
  import { ui } from './lib/stores/ui.svelte';

  const settings = WINDOW === 'settings';
  let ready = $state(false);

  onMount(() => {
    // Every way of closing the window (its buttons, Escape, ⌘W) comes through here.
    getCurrentWindow().onCloseRequested(async e => {
      if (!settings && ed.dirty && !(await ui.confirm('Discard your changes?', 'Discard'))) return e.preventDefault();
      await flushField(); // a Settings field still waiting to save
    });
    bootWindow().finally(() => {
      if (settings) ui.settingsOpen = true;
      else openEditor((window.__FLOP_SECTION__ as Section) || 'conversation');
      ready = true;
    });
  });

  $effect(() => {
    document.title = settings ? 'Settings' : 'Editor';
    const root = document.documentElement;
    if (store.brand.accent) root.style.setProperty('--accent', store.brand.accent);
    else root.style.removeProperty('--accent');
  });

  const onclick = (e: MouseEvent) => openLinksExternally(e, err => ui.toast(`Couldn't open the link (${err}).`));

  /* a .zip or .json config dropped anywhere on Settings imports it, as on the chat window */
  function ondragover(e: DragEvent) {
    if (settings && e.dataTransfer && [...e.dataTransfer.types].includes('Files')) e.preventDefault();
  }
  function ondrop(e: DragEvent) {
    if (!settings || !e.dataTransfer?.files.length) return;
    e.preventDefault();
    const configs = [...e.dataTransfer.files].filter(isConfigFile);
    if (configs.length) importFiles(configs);
    else ui.toast('Drop a .zip or .json config to import it.');
  }
</script>

<svelte:window {onclick} {ondragover} {ondrop} />

<IconSprite />

{#if ready}
  {#if settings}
    <SettingsDialog />
  {:else}
    <EditorDialog />
  {/if}
  <Lightbox />
  <ConfirmDialog />
{/if}
<Toast />
