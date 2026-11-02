<!-- Settings: the header, tabs and footer stay put while the tab between them scrolls. -->
<script lang="ts">
  import { TAURI } from '../../lib/backend';
  import { narrow, ui } from '../../lib/stores/ui.svelte';
  import Modal from '../Modal.svelte';
  import AboutTab from './AboutTab.svelte';
  import BrandingTab from './BrandingTab.svelte';
  import ConversationTab from './ConversationTab.svelte';
  import ServerPanel from './ServerPanel.svelte';

  type Tab = 'conversation' | 'branding' | 'server' | 'about';
  // A tab with an icon shows just the icon on narrow screens.
  const tabs: { key: Tab; label: string; icon?: string }[] = [
    { key: 'conversation', label: 'Conversation' },
    { key: 'branding', label: 'Branding' },
    ...(TAURI ? [{ key: 'server' as const, label: 'Server' }] : []),
    { key: 'about', label: 'About', icon: 'i-info' },
  ];
  let tab = $state<Tab>('conversation');
  let body = $state<HTMLDivElement>();

  function show(t: Tab) {
    tab = t;
    if (body) body.scrollTop = 0;
  }
</script>

<Modal class="settings" labelledby="settingsTitle" backdropClose bind:open={ui.settingsOpen}>
  <div class="dlg">
    <header>
      <h2 id="settingsTitle">Settings</h2>
      <button class="icon-btn" type="button" aria-label="Close" onclick={() => (ui.settingsOpen = false)}>
        <svg class="icon"><use href="#i-close" /></svg>
      </button>
    </header>
    <div class="tabs set-tabs" role="tablist" aria-label="Settings">
      {#each tabs as t (t.key)}
        {@const iconOnly = !!t.icon && narrow.current}
        <button
          class="tab"
          class:on={tab === t.key}
          class:icon-tab={iconOnly}
          type="button"
          role="tab"
          id="setTab-{t.key}"
          aria-selected={tab === t.key}
          aria-controls="setPanel"
          aria-label={iconOnly ? t.label : undefined}
          title={iconOnly ? t.label : undefined}
          onclick={() => show(t.key)}
          >{#if iconOnly}<svg class="icon" aria-hidden="true"><use href="#{t.icon}" /></svg
            >{:else}{t.label}{/if}</button
        >
      {/each}
    </div>

    <div class="set-body" id="setPanel" role="tabpanel" aria-labelledby="setTab-{tab}" bind:this={body}>
      {#if tab === 'conversation'}
        <ConversationTab />
      {:else if tab === 'branding'}
        <BrandingTab />
      {:else if tab === 'about'}
        <AboutTab />
      {/if}
      {#if TAURI}
        <div hidden={tab !== 'server'}><ServerPanel active={ui.settingsOpen && tab === 'server'} /></div>
      {/if}
    </div>

    <footer class="set-foot">
      made by Coal Cooper.
      <a href="https://ko-fi.com/cocowmn" target="_blank" rel="noopener noreferrer">Support my work on Ko-Fi ☕️</a>
    </footer>
  </div>
</Modal>

<style>
  .set-tabs {
    margin: 4px 0 12px;
  }
  .set-tabs .tab {
    flex: 1;
  }
  .set-tabs .tab.icon-tab {
    display: grid;
    flex: none;
    place-items: center;
    padding: 0 10px;
  }
  .icon-tab .icon {
    width: 16px;
    height: 16px;
  }
  .set-body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    margin: 0 -20px;
    padding: 12px 20px 2px;
    border-top: 1px solid var(--line);
  }
  .set-foot {
    margin: 0 -20px -4px;
    padding: 10px 20px 0;
    border-top: 1px solid var(--line);
    color: var(--muted);
    font-size: 12px;
    text-align: center;
  }
  .set-foot a {
    color: var(--accent);
  }
</style>
