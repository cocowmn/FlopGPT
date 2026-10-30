<script lang="ts">
  import { startOver, store } from '../lib/stores/config.svelte';
  import { ui } from '../lib/stores/ui.svelte';

  function newChat() {
    startOver();
    ui.closeSidebarIfNarrow();
  }
</script>

<header class="topbar">
  <button
    class="icon-btn toggle"
    type="button"
    aria-label="Toggle sidebar"
    onclick={() => (ui.sidebarOpen = !ui.sidebarOpen)}
  >
    <svg class="icon"><use href="#i-sidebar" /></svg>
  </button>
  <div class="model">{store.brand.model}</div>
  <div class="actions">
    <button class="icon-btn" type="button" aria-label="New chat" onclick={newChat}>
      <svg class="icon"><use href="#i-plus" /></svg>
    </button>
  </div>
</header>

<style>
  .topbar {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: none;
    padding: calc(6px + env(safe-area-inset-top)) 10px 6px;
  }
  /* On wide screens the open sidebar has its own close button. */
  @media (min-width: 900px) {
    :global(.app[data-sidebar='open']) .toggle {
      display: none;
    }
  }
  .model {
    padding: 6px 10px;
    font-weight: 600;
  }
  .actions {
    display: flex;
    gap: 2px;
    margin-left: auto;
  }
</style>
