<script lang="ts">
  import { imageFailed, shown, startOver, store } from '../lib/stores/config.svelte';
  import { SETTINGS_ARIA_KEY, SETTINGS_KEY, ui } from '../lib/stores/ui.svelte';
  import Logo from './Logo.svelte';
  import ThreadList from './ThreadList.svelte';

  const avatar = $derived(store.images.userAvatar.src);

  function newChat() {
    startOver();
    ui.closeSidebarIfNarrow();
  }
</script>

<aside class="sidebar" aria-label="Conversations">
  <div class="sb-head">
    <div class="brand"><Logo class="brand-logo" kind="smallLogo" /><span>{store.brand.name}</span></div>
    <button class="icon-btn" type="button" aria-label="Close sidebar" onclick={() => (ui.sidebarOpen = false)}>
      <svg class="icon"><use href="#i-sidebar" /></svg>
    </button>
  </div>

  <button class="new-chat" type="button" onclick={newChat}
    ><svg class="icon"><use href="#i-plus" /></svg>New chat</button
  >

  <label class="search">
    <svg class="icon"><use href="#i-search" /></svg>
    <input
      type="search"
      placeholder="Search chats"
      autocomplete="off"
      aria-label="Search chats"
      bind:value={ui.search}
    />
  </label>

  <ThreadList />

  <div class="sb-foot">
    {#if shown(avatar)}
      <img class="avatar user" src={avatar} alt="" onerror={() => imageFailed('userAvatar', avatar)} />
    {:else}
      <div class="avatar user" aria-hidden="true">{store.brand.initial}</div>
    {/if}
    <span class="user-name">{store.brand.user}</span>
    <button
      class="icon-btn"
      type="button"
      aria-label="Demo settings"
      aria-keyshortcuts={SETTINGS_ARIA_KEY}
      title="Demo settings ({SETTINGS_KEY})"
      onclick={() => (ui.settingsOpen = true)}
    >
      <svg class="icon"><use href="#i-sliders" /></svg>
    </button>
  </div>
</aside>

<style>
  .sidebar {
    position: fixed;
    inset: 0 auto 0 0;
    z-index: 30;
    width: min(var(--sbw), 86vw);
    display: flex;
    flex-direction: column;
    padding: calc(8px + env(safe-area-inset-top)) 10px calc(8px + env(safe-area-inset-bottom));
    background: var(--side);
    border-right: 1px solid var(--line);
    transform: translateX(-100%);
    visibility: hidden;
    transition:
      transform 0.25s ease,
      visibility 0s 0.25s;
  }
  :global(.app[data-sidebar='open']) .sidebar {
    transform: none;
    visibility: visible;
    transition:
      transform 0.25s ease,
      visibility 0s;
  }

  .sb-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 2px 0 8px;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-left: 6px;
    font-weight: 650;
    font-size: 17px;
  }
  .brand :global(.brand-logo) {
    width: 22px;
    height: 22px;
    color: var(--accent);
  }

  .new-chat {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 10px 12px;
    border: 0;
    border-radius: 12px;
    background: none;
    color: var(--text);
    font: inherit;
    font-weight: 500;
    cursor: pointer;
  }
  .new-chat:hover {
    background: var(--hover);
  }

  .search {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 12px;
    border-radius: 12px;
    color: var(--muted);
  }
  .search:focus-within {
    background: var(--hover);
  }
  .search input {
    flex: 1;
    min-width: 0;
    border: 0;
    outline: 0;
    background: none;
    color: var(--text);
    font: inherit;
  }

  .sb-foot {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 4px 2px;
    border-top: 1px solid var(--line);
  }
  .user-name {
    flex: 1;
    min-width: 0;
    font-size: 15px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
