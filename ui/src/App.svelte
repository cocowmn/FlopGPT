<script lang="ts">
  import { getCurrentWindow } from '@tauri-apps/api/window';
  import { onMount } from 'svelte';
  import ChatView from './components/ChatView.svelte';
  import Composer from './components/Composer.svelte';
  import ConfirmDialog from './components/ConfirmDialog.svelte';
  import DebugMenu from './components/DebugMenu.svelte';
  import EditorDialog from './components/editor/EditorDialog.svelte';
  import IconSprite from './components/IconSprite.svelte';
  import Lightbox from './components/Lightbox.svelte';
  import SettingsDialog from './components/settings/SettingsDialog.svelte';
  import Sidebar from './components/Sidebar.svelte';
  import Toast from './components/Toast.svelte';
  import Topbar from './components/Topbar.svelte';
  import { TAURI } from './lib/backend';
  import { brandApp } from './lib/pwa';
  import { boot, dropFiles, shown, store } from './lib/stores/config.svelte';
  import { MAC, ui, wide } from './lib/stores/ui.svelte';

  let ready = $state(false); // the config has loaded (or couldn't): until then the page stays blank
  let preload = $state(true);
  const favicon = document.getElementById('favicon') as HTMLLinkElement;
  const DEFAULT_FAVICON = favicon.href;

  onMount(() => {
    if (TAURI && MAC) trackTitlebar();
    boot()
      .then(loadImages)
      .finally(() => {
        ready = true;
        requestAnimationFrame(() => requestAnimationFrame(() => (preload = false)));
      });
  });

  // The Mac window's buttons sit over the page (titleBarStyle: Overlay), except in fullscreen where macOS hides them.
  async function trackTitlebar() {
    const win = getCurrentWindow();
    const root = document.documentElement;
    const update = async () => root.classList.toggle('mac-titlebar', !(await win.isFullscreen()));
    root.classList.add('mac-titlebar');
    await update();
    await win.onResized(update);
  }

  // Waits, briefly, for the config's images so they show up with the rest of the page instead of after it.
  function loadImages() {
    const srcs = Object.values(store.images).map(i => shown(i.src));
    const loads = [...new Set(srcs.filter(Boolean))].map(src => {
      const img = new Image();
      img.src = src;
      return img.decode().catch(() => {});
    });
    return Promise.race([Promise.all(loads), new Promise(r => setTimeout(r, 1500))]);
  }

  $effect(() => {
    ui.sidebarOpen = wide.current;
  });

  // Branding that lives outside the components: tab title, accent, favicon, installed app.
  $effect(() => {
    if (!ready) return; // index.html's defaults until then
    const b = store.brand;
    document.title = b.name;
    const root = document.documentElement;
    if (b.accent) root.style.setProperty('--accent', b.accent);
    else root.style.removeProperty('--accent');
    const img = store.images;
    root.classList.toggle('has-logo', !!shown(img.logo.src));
    favicon.href = shown(img.favicon.src) || DEFAULT_FAVICON;
    brandApp({
      name: b.name,
      accent: b.accent,
      logo: shown(img.appIcon.src),
      fullBleed: !img.appIcon.inherited,
    });
  });

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') ui.closeSidebarIfNarrow();
    // ⌘, / Ctrl+, opens the settings, as in most apps
    if (e.key === ',' && (MAC ? e.metaKey : e.ctrlKey) && !e.altKey && !e.shiftKey) {
      e.preventDefault();
      ui.settingsOpen = true;
    }
  }

  /* drag & drop files anywhere on the page */
  function ondragover(e: DragEvent) {
    if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) e.preventDefault();
  }
  function ondrop(e: DragEvent) {
    if (!e.dataTransfer || !e.dataTransfer.files.length) return;
    e.preventDefault();
    dropFiles([...e.dataTransfer.files]);
  }
</script>

<svelte:window {onkeydown} {ondragover} {ondrop} />

<IconSprite />

{#if ready}
  <div class="app" class:preload data-sidebar={ui.sidebarOpen ? 'open' : 'closed'}>
    <Sidebar />
    <div class="backdrop" role="presentation" onclick={() => (ui.sidebarOpen = false)}></div>
    <main class="main">
      <Topbar />
      <ChatView />
      <Composer />
    </main>
  </div>

  <SettingsDialog />
  <EditorDialog />
  <Lightbox />
  <ConfirmDialog />
  <DebugMenu />
{/if}
<Toast />

<style>
  .app {
    height: 100vh;
    height: 100dvh;
  }

  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 20;
    background: rgba(0, 0, 0, 0.4);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.25s ease;
  }
  .app[data-sidebar='open'] .backdrop {
    opacity: 1;
    pointer-events: auto;
  }

  .main {
    display: flex;
    flex-direction: column;
    height: 100vh;
    height: 100dvh;
    min-width: 0;
  }

  @media (min-width: 900px) {
    .backdrop {
      display: none;
    }
    .main {
      transition: margin-left 0.25s ease;
    }
    .app[data-sidebar='open'] .main {
      margin-left: var(--sbw);
    }
  }
</style>
