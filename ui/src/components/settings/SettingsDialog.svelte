<script lang="ts">
  import Modal from '../Modal.svelte';
  import ServerPanel from './ServerPanel.svelte';
  import { openEditor } from '../editor/editor.svelte';
  import { TAURI } from '../../lib/backend';
  import { plural } from '../../lib/files';
  import { exportConfig, importFiles, resetDefaults, resetLogo, setLogoFile, startOver, store } from '../../lib/stores/config.svelte';
  import { ui } from '../../lib/stores/ui.svelte';

  let configPicker: HTMLInputElement;
  let logoPicker: HTMLInputElement;

  const configInfo = $derived(
    `${store.brand.name} · ${plural(store.script.responses.length, 'response')} · ${plural(store.threads.length, 'chat')}` +
      (store.pending ? ' · update waiting for New chat' : '')
  );
  const logo = $derived(store.brand.logo);

  async function pickedConfig() {
    await importFiles([...(configPicker.files ?? [])]);
    configPicker.value = '';
  }
  async function pickedLogo() {
    const f = logoPicker.files?.[0];
    if (f) await setLogoFile(f);
    logoPicker.value = '';
  }
  function editConfig() {
    ui.settingsOpen = false;
    openEditor();
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
      <div><strong>Config</strong><p>{configInfo}</p></div>
      <div class="set-btns">
        <button class="btn" type="button" disabled={store.locked} onclick={editConfig}>Edit</button>
        <button class="btn" type="button" disabled={store.locked} onclick={() => configPicker.click()}>Import…</button>
        <button class="btn" type="button" onclick={() => exportConfig()}>Export…</button>
      </div>
    </div>

    <div class="set-row">
      <div><strong>Logo</strong><p>{!logo ? 'Default' : logo.startsWith('data:') ? 'Custom image' : logo}</p></div>
      <div class="set-btns">
        <button class="btn" type="button" disabled={store.locked} onclick={() => logoPicker.click()}>Choose image…</button>
        <button class="btn" type="button" disabled={store.locked || !logo} onclick={resetLogo}>Reset</button>
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
<input bind:this={logoPicker} type="file" accept="image/*" hidden onchange={pickedLogo} />

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
