<!-- In-app stand-in for confirm(): ask with ui.confirm(message, okLabel). -->
<script lang="ts">
  import Modal from './Modal.svelte';
  import { ui } from '../lib/stores/ui.svelte';

  let message = $state('');
  let ok = $state('OK');
  $effect(() => {
    if (ui.confirmReq) ({ message, ok } = ui.confirmReq);
  });

  function answer(yes: boolean) {
    ui.confirmReq?.resolve(yes);
    ui.confirmReq = null;
  }
</script>

<Modal class="confirm" label="Confirm" bind:open={() => !!ui.confirmReq, v => !v && answer(false)}>
  <div class="dlg">
    <p>{message}</p>
    <div class="foot">
      <button class="btn" type="button" onclick={() => answer(false)}>Cancel</button>
      <!-- svelte-ignore a11y_autofocus -->
      <button class="btn primary" type="button" autofocus onclick={() => answer(true)}>{ok}</button>
    </div>
  </div>
</Modal>

<style>
  p {
    margin: 4px 0 16px;
  }
  .foot {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
</style>
