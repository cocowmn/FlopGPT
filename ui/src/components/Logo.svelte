<!-- The default sparkle, or the config's image for this spot (falls back to the sparkle if it won't load). -->
<script lang="ts">
  import type { ImageKey } from '../lib/images';
  import { imageFailed, shown, store } from '../lib/stores/config.svelte';

  let { class: cls = '', kind = 'logo' }: { class?: string; kind?: ImageKey } = $props();

  const src = $derived(store.images[kind].src);
</script>

<span class="logo-slot {cls}">
  {#if shown(src)}
    <img {src} alt="" onerror={() => imageFailed(kind, src)} />
  {:else}
    <svg class="icon" aria-hidden="true"><use href="#i-logo" /></svg>
  {/if}
</span>
