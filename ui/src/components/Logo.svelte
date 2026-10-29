<!-- The default sparkle, or the config's logo image (falls back to the sparkle if it won't load). -->
<script lang="ts">
  import { abs } from '../lib/location';
  import { store } from '../lib/stores/config.svelte';
  import { ui } from '../lib/stores/ui.svelte';

  let { class: cls = '' }: { class?: string } = $props();

  const src = $derived(store.brand.logo ? abs(store.brand.logo) : '');

  function onerror() {
    if (ui.logoFailedFor === src) return;
    ui.logoFailedFor = src;
    ui.toast("Couldn't load the logo image, so the default is shown.");
  }
</script>

<span class="logo-slot {cls}">
  {#if src && ui.logoFailedFor !== src}
    <img {src} alt="" {onerror} />
  {:else}
    <svg class="icon" aria-hidden="true"><use href="#i-logo" /></svg>
  {/if}
</span>
