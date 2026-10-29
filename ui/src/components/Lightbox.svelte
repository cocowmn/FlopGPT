<script lang="ts">
  import Modal from './Modal.svelte';
  import { ui } from '../lib/stores/ui.svelte';

  // Keep the last image while the dialog closes.
  let shown = $state({ src: '', alt: '' });
  $effect(() => {
    if (ui.lightbox) shown = ui.lightbox;
  });
</script>

<Modal
  class="lightbox"
  label="Image preview"
  bind:open={() => !!ui.lightbox, v => !v && (ui.lightbox = null)}
  onclick={() => (ui.lightbox = null)}
>
  <img src={shown.src} alt={shown.alt} />
</Modal>

<style>
  img {
    display: block;
    max-width: 96vw;
    max-height: 92dvh;
    border-radius: 14px;
    cursor: zoom-out;
  }
</style>
