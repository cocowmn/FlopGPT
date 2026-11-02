<!-- Settings' Conversation tab: the script and old conversations, how they play, and the config file. -->
<script lang="ts">
  import { plural } from '../../lib/files';
  import type { Section } from '../../lib/normalize';
  import {
    exportConfig,
    importFiles,
    resetDefaults,
    resetSection,
    startOver,
    store,
  } from '../../lib/stores/config.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import { openEditor } from '../editor/editor.svelte';
  import PlaybackOptions from './PlaybackOptions.svelte';

  let configPicker: HTMLInputElement;

  const sections: { key: Section; title: string; info: () => string }[] = [
    {
      key: 'conversation',
      title: 'Script',
      info: () =>
        plural(store.script.responses.length, 'response') + (store.pending ? ' · update waiting for New chat' : ''),
    },
    { key: 'threads', title: 'Old conversations', info: () => plural(store.threads.length, 'chat') },
  ];

  async function pickedConfig() {
    await importFiles([...(configPicker.files ?? [])]);
    configPicker.value = '';
  }
  function restart() {
    startOver();
    ui.settingsOpen = false;
  }
</script>

{#each sections as sec, i (sec.key)}
  <div class="set-row" class:first={i === 0}>
    <div>
      <strong>{sec.title}</strong>
      <p>{sec.info()}</p>
    </div>
    <div class="set-btns">
      <button class="btn" type="button" disabled={store.locked} onclick={() => openEditor(sec.key)}>Edit</button>
      <button class="btn" type="button" disabled={store.locked} onclick={() => resetSection(sec.key)}>Reset</button>
    </div>
  </div>
{/each}

<h3 class="set-head">Playback</h3>
<PlaybackOptions />

<div class="set-row">
  <div>
    <strong>Config file</strong>
    <p>The script, branding and images, in one .zip</p>
  </div>
  <div class="set-btns">
    <button class="btn" type="button" disabled={store.locked} onclick={() => configPicker.click()}>Import…</button>
    <button class="btn" type="button" onclick={() => exportConfig()}>Export…</button>
  </div>
</div>

<div class="set-actions">
  <button class="btn" type="button" onclick={restart}>Restart script</button>
  <button class="btn" type="button" disabled={store.locked} onclick={resetDefaults}>Reset to defaults</button>
</div>

<p class="hint">
  {store.saveNote}<br />
  Tip: drop a .zip or .json config anywhere on the page to import it.
</p>

<input
  bind:this={configPicker}
  type="file"
  accept=".zip,.json,application/zip,application/json"
  hidden
  onchange={pickedConfig}
/>

<style>
  .set-head {
    margin: 0;
    padding: 12px 0 10px;
    border-top: 1px solid var(--line);
    font-size: 15px;
  }

  .set-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 0;
    border-top: 1px solid var(--line);
  }
  .set-row.first {
    padding-top: 0;
    border-top: 0;
  }
  .set-row p {
    margin: 2px 0 0;
    font-size: 13px;
    color: var(--muted);
    overflow-wrap: anywhere;
  }

  .set-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 12px 0;
    border-top: 1px solid var(--line);
  }
  .hint {
    margin: 4px 0 0;
    font-size: 13px;
    color: var(--muted);
  }
</style>
