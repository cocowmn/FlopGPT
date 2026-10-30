<!-- Demo settings: the header and tabs stay put while the tab below scrolls. -->
<script lang="ts">
  import { TAURI } from '../../lib/backend';
  import { ui } from '../../lib/stores/ui.svelte';
  import Modal from '../Modal.svelte';
  import ConfigTab from './ConfigTab.svelte';
  import ImagesTab from './ImagesTab.svelte';
  import ServerPanel from './ServerPanel.svelte';

  type Tab = 'config' | 'images' | 'server';
  const tabs: { key: Tab; label: string }[] = [
    { key: 'config', label: 'Config' },
    { key: 'images', label: 'Images' },
    ...(TAURI ? [{ key: 'server' as const, label: 'Server' }] : []),
  ];
  let tab = $state<Tab>('config');
  let body = $state<HTMLDivElement>();

  function show(t: Tab) {
    tab = t;
    if (body) body.scrollTop = 0;
  }
</script>

<Modal class="settings" labelledby="settingsTitle" backdropClose bind:open={ui.settingsOpen}>
  <div class="dlg">
    <header>
      <h2 id="settingsTitle">Demo settings</h2>
      <button class="icon-btn" type="button" aria-label="Close" onclick={() => (ui.settingsOpen = false)}>
        <svg class="icon"><use href="#i-close" /></svg>
      </button>
    </header>
    <div class="tabs set-tabs" role="tablist" aria-label="Settings">
      {#each tabs as t (t.key)}
        <button
          class="tab"
          class:on={tab === t.key}
          type="button"
          role="tab"
          id="setTab-{t.key}"
          aria-selected={tab === t.key}
          aria-controls="setPanel"
          onclick={() => show(t.key)}>{t.label}</button
        >
      {/each}
    </div>

    <div class="set-body" id="setPanel" role="tabpanel" aria-labelledby="setTab-{tab}" bind:this={body}>
      {#if tab === 'config'}
        <ConfigTab />
      {:else if tab === 'images'}
        <ImagesTab />
      {/if}
      {#if TAURI}
        <div hidden={tab !== 'server'}><ServerPanel active={ui.settingsOpen && tab === 'server'} /></div>
      {/if}
    </div>
  </div>
</Modal>

<style>
  .set-tabs {
    margin: 4px 0 12px;
  }
  .set-tabs .tab {
    flex: 1;
  }
  .set-body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    margin: 0 -20px;
    padding: 12px 20px 2px;
    border-top: 1px solid var(--line);
  }
</style>
