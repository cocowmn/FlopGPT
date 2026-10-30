<script lang="ts">
  import { TAURI } from '../../lib/backend';
  import { plural } from '../../lib/files';
  import { IMAGE_SLOTS } from '../../lib/images';
  import { exportConfig, importFiles, resetDefaults, startOver, store } from '../../lib/stores/config.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import { openEditor } from '../editor/editor.svelte';
  import Modal from '../Modal.svelte';
  import ServerPanel from './ServerPanel.svelte';

  let configPicker: HTMLInputElement;

  const configInfo = $derived(
    `${store.brand.name} · ${plural(store.script.responses.length, 'response')} · ${plural(store.threads.length, 'chat')}` +
      (store.pending ? ' · update waiting for New chat' : ''),
  );
  const customImages = $derived(IMAGE_SLOTS.filter(s => store.images[s.key].own));
  const imagesInfo = $derived(
    customImages.length
      ? `Custom ${customImages.map(s => s.label.toLowerCase()).join(', ')}`
      : `All ${IMAGE_SLOTS.length} default`,
  );

  async function pickedConfig() {
    await importFiles([...(configPicker.files ?? [])]);
    configPicker.value = '';
  }
  function editConfig() {
    ui.settingsOpen = false;
    openEditor();
  }
  function editImages() {
    ui.settingsOpen = false;
    ui.imagesOpen = true;
  }
  function restart() {
    startOver();
    ui.settingsOpen = false;
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

    <div class="set-row">
      <div>
        <strong>Config</strong>
        <p>{configInfo}</p>
      </div>
      <div class="set-btns">
        <button class="btn" type="button" disabled={store.locked} onclick={editConfig}>Edit</button>
        <button class="btn" type="button" disabled={store.locked} onclick={() => configPicker.click()}>Import…</button>
        <button class="btn" type="button" onclick={() => exportConfig()}>Export…</button>
      </div>
    </div>

    <div class="set-row">
      <div>
        <strong>Images</strong>
        <p>{imagesInfo}</p>
      </div>
      <div class="set-btns">
        <button class="btn" type="button" onclick={editImages}>Edit</button>
      </div>
    </div>

    {#if TAURI}<ServerPanel active={ui.settingsOpen} />{/if}

    <div class="set-actions">
      <button class="btn" type="button" onclick={restart}>Restart script</button>
      <button class="btn" type="button" disabled={store.locked} onclick={resetDefaults}>Reset to defaults</button>
    </div>

    <p class="hint">
      {store.saveNote}<br />
      Tip: drop a .json config anywhere on the page to import it.
    </p>
  </div>
</Modal>

<input bind:this={configPicker} type="file" accept=".json,application/json" hidden onchange={pickedConfig} />

<style>
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
