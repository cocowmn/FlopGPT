<script lang="ts">
  import { onMount } from "svelte";
  import IconSprite from "./components/IconSprite.svelte";
  import Sidebar from "./components/Sidebar.svelte";
  import Topbar from "./components/Topbar.svelte";
  import ChatView from "./components/ChatView.svelte";
  import Composer from "./components/Composer.svelte";
  import SettingsDialog from "./components/settings/SettingsDialog.svelte";
  import EditorDialog from "./components/editor/EditorDialog.svelte";
  import Lightbox from "./components/Lightbox.svelte";
  import ConfirmDialog from "./components/ConfirmDialog.svelte";
  import Toast from "./components/Toast.svelte";
  import { abs } from "./lib/location";
  import { brandApp } from "./lib/pwa";
  import { boot, dropFiles, store } from "./lib/stores/config.svelte";
  import { ui, wide } from "./lib/stores/ui.svelte";

  let preload = $state(true);
  const favicon = document.getElementById("favicon") as HTMLLinkElement;
  const DEFAULT_FAVICON = favicon.href;

  onMount(() => {
    boot().then(() =>
      requestAnimationFrame(() =>
        requestAnimationFrame(() => (preload = false)),
      ),
    );
  });

  $effect(() => {
    ui.sidebarOpen = wide.current;
  });

  // Branding that lives outside the components: tab title, accent, favicon, installed app.
  $effect(() => {
    const b = store.brand;
    document.title = b.name;
    const root = document.documentElement;
    if (b.accent) root.style.setProperty("--accent", b.accent);
    else root.style.removeProperty("--accent");
    const src = b.logo ? abs(b.logo) : "";
    root.classList.toggle("has-logo", !!src && ui.logoFailedFor !== src);
    favicon.href = src || DEFAULT_FAVICON;
    brandApp({
      name: b.name,
      accent: b.accent,
      logo: src && ui.logoFailedFor !== src ? src : "",
    });
  });

  function onkeydown(e: KeyboardEvent) {
    if (e.key === "Escape") ui.closeSidebarIfNarrow();
  }

  /* drag & drop files anywhere on the page */
  function ondragover(e: DragEvent) {
    if (e.dataTransfer && [...e.dataTransfer.types].includes("Files"))
      e.preventDefault();
  }
  function ondrop(e: DragEvent) {
    if (!e.dataTransfer || !e.dataTransfer.files.length) return;
    e.preventDefault();
    dropFiles([...e.dataTransfer.files]);
  }
</script>

<svelte:window {onkeydown} {ondragover} {ondrop} />

<IconSprite />

<div
  class="app"
  class:preload
  data-sidebar={ui.sidebarOpen ? "open" : "closed"}
>
  <Sidebar />
  <div
    class="backdrop"
    role="presentation"
    onclick={() => (ui.sidebarOpen = false)}
  ></div>
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
  .app[data-sidebar="open"] .backdrop {
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
    .app[data-sidebar="open"] .main {
      margin-left: var(--sbw);
    }
  }
</style>
