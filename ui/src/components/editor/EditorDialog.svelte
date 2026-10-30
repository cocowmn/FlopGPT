<!-- Change the config: a form for the settings, responses and old conversations, or raw JSON. -->
<script lang="ts">
  import { untrack } from 'svelte';
  import { fromEditData, parseConfigJson, toEditData } from '../../lib/normalize';
  import { applyConfig, exportConfig, saveConfig, store } from '../../lib/stores/config.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import type { Config } from '../../lib/types';
  import Modal from '../Modal.svelte';
  import ScriptSettingsForm from './ScriptSettingsForm.svelte';
  import ThreadsForm from './ThreadsForm.svelte';
  import './editor.css';
  import { changed, ed } from './editor.svelte';

  let mode = $state<'form' | 'json'>('form');
  let json = $state('');
  let error = $state('');
  let body = $state<HTMLDivElement>();

  // A fresh start each time it opens.
  $effect(() => {
    if (!ui.editorOpen) return;
    untrack(() => {
      mode = 'form';
      error = '';
      if (body) body.scrollTop = 0;
    });
  });

  // What the editor currently holds, as config JSON.
  const output = (): Config => (mode === 'form' ? fromEditData(ed.data!) : parseConfigJson(json));

  function setMode(m: typeof mode) {
    error = '';
    if (m === mode) return;
    try {
      if (m === 'json') json = JSON.stringify(output(), null, 2);
      else ed.data = toEditData(output());
    } catch (e) {
      error = (e as Error).message;
      return;
    }
    mode = m;
  }

  async function requestClose() {
    if (!ed.dirty || (await ui.confirm('Discard your changes?', 'Discard'))) ui.editorOpen = false;
  }

  function exportIt() {
    error = '';
    try {
      exportConfig(output());
    } catch (e) {
      error = (e as Error).message;
    }
  }

  function apply() {
    error = '';
    let cfg: Config;
    try {
      cfg = output();
      applyConfig(cfg, true);
    } catch (e) {
      error = (e as Error).message;
      return;
    }
    ed.dirty = false;
    ui.editorOpen = false;
    saveConfig(cfg).then(ok => ok && ui.toast('Saved'));
  }
</script>

<Modal class="editor" labelledby="edTitle" bind:open={ui.editorOpen} onrequestclose={requestClose}>
  <div class="dlg">
    <header>
      <h2 id="edTitle">Edit config</h2>
      <div class="ed-tabs" role="group" aria-label="Editor mode">
        <button class="ed-tab" class:on={mode === 'form'} type="button" onclick={() => setMode('form')}>Form</button>
        <button class="ed-tab" class:on={mode === 'json'} type="button" onclick={() => setMode('json')}>JSON</button>
      </div>
    </header>
    {#if mode === 'form' && ed.data}
      <div class="ed-body" bind:this={body} oninput={changed}>
        {#key ed.data}
          <ScriptSettingsForm s={ed.data.script} />
          <ThreadsForm items={ed.data.threads} />
        {/key}
      </div>
    {:else}
      <textarea class="ed-in ed-json" spellcheck="false" aria-label="JSON" bind:value={json} oninput={changed}
      ></textarea>
    {/if}
    {#if error}<p class="ed-error" role="alert">{error}</p>{/if}
    <p class="ed-warn">{store.saveNote}</p>
    <div class="ed-foot">
      <button class="btn" type="button" onclick={exportIt}>Export…</button>
      <button class="btn" type="button" onclick={requestClose}>Cancel</button>
      <button class="btn primary" type="button" onclick={apply}>Save &amp; restart</button>
    </div>
  </div>
</Modal>

<style>
  .ed-tabs {
    display: flex;
    padding: 3px;
    border-radius: 10px;
    background: var(--hover);
  }
  .ed-tab {
    padding: 5px 12px;
    border: 0;
    border-radius: 8px;
    background: none;
    color: var(--muted);
    font: inherit;
    font-size: 13px;
    cursor: pointer;
  }
  .ed-tab.on {
    background: var(--bg);
    color: var(--text);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
  }
  .ed-body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    margin: 0 -20px;
    padding: 0 20px 4px;
    border-top: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
  }
  .ed-json {
    flex: 1;
    min-height: 50vh;
    resize: none;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 13px;
    white-space: pre;
  }
  .ed-error {
    margin: 10px 0 0;
    font-size: 13px;
    color: #d93a3a;
  }
  .ed-warn {
    margin: 10px 0 0;
    font-size: 13px;
    color: var(--muted);
  }
  .ed-foot {
    display: flex;
    gap: 8px;
    margin-top: 12px;
  }
</style>
