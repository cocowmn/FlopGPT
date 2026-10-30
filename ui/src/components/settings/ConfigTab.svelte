<!-- Settings' Config tab: branding that applies as it's typed, plus the conversation and old conversations. -->
<script lang="ts">
  import { plural } from '../../lib/files';
  import type { Section } from '../../lib/normalize';
  import {
    exportConfig,
    importFiles,
    resetDefaults,
    resetSection,
    setField,
    startOver,
    store,
  } from '../../lib/stores/config.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import AccentField from '../editor/AccentField.svelte';
  import { openEditor } from '../editor/editor.svelte';
  import Field from '../editor/Field.svelte';

  let configPicker: HTMLInputElement;

  // The branding fields, each with the default it falls back to when left blank.
  const fields = $derived([
    { key: 'appName', label: 'App name', placeholder: 'FlopGPT' },
    { key: 'modelName', label: 'Model name', placeholder: store.brand.name },
    { key: 'userName', label: 'User name', placeholder: 'You' },
    { key: 'accent', label: 'Accent color', placeholder: '' },
    { key: 'greeting', label: 'Greeting', placeholder: 'How can I help you today?', wide: true },
    { key: 'placeholder', label: 'Placeholder', placeholder: `Message ${store.brand.name}`, wide: true },
    {
      key: 'disclaimer',
      label: 'Disclaimer',
      placeholder: `${store.brand.name} can make mistakes. Check important info.`,
      wide: true,
    },
  ]);
  const value = (key: string) => String(store.config[key] ?? '');

  const sections: { key: Section; title: string; info: () => string }[] = [
    {
      key: 'conversation',
      title: 'Conversation',
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

<div class="cfg-grid">
  {#each fields as f (f.key)}
    <Field label={f.label} wide={f.wide}>
      {#if f.key === 'accent'}
        <AccentField value={value(f.key)} set={v => setField(f.key, v)} disabled={store.locked} />
      {:else}
        <input
          class="ed-in"
          placeholder={f.placeholder}
          value={value(f.key)}
          disabled={store.locked}
          oninput={e => setField(f.key, e.currentTarget.value)}
        />
      {/if}
    </Field>
  {/each}
</div>

{#each sections as sec (sec.key)}
  <div class="set-row">
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

<div class="set-row">
  <div>
    <strong>Config file</strong>
    <p>Everything above, plus the images, in one .json</p>
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
  Tip: drop a .json config anywhere on the page to import it.
</p>

<input bind:this={configPicker} type="file" accept=".json,application/json" hidden onchange={pickedConfig} />

<style>
  .cfg-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 10px;
    padding-bottom: 16px;
  }
  /* Field's own top margin is for stacked fields; the grid spaces these. */
  .cfg-grid :global(.ed-field) {
    margin-top: 0;
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
