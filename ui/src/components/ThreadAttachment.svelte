<!-- A sent attachment in the thread: images open in the lightbox, media get players. -->
<script lang="ts">
  import { ui } from '../lib/stores/ui.svelte';
  import type { Attachment } from '../lib/types';
  import FileChip from './FileChip.svelte';

  let { a }: { a: Attachment } = $props();
  let broken = $state(false); // e.g. a format the browser can't show
</script>

{#if a.kind === 'image' && !broken}
  <button
    type="button"
    class="att-img"
    aria-label="View {a.file.name}"
    onclick={() => (ui.lightbox = { src: a.url, alt: a.file.name })}
  >
    <img src={a.url} alt={a.file.name} onload={() => ui.stick()} onerror={() => (broken = true)} />
  </button>
{:else if a.kind === 'video'}
  <!-- svelte-ignore a11y_media_has_caption -->
  <video src={a.url} controls preload="metadata" playsinline onloadedmetadata={() => ui.stick()}></video>
{:else if a.kind === 'audio'}
  <audio src={a.url} controls preload="metadata"></audio>
{:else}
  <FileChip file={a.file} />
{/if}

<style>
  .att-img {
    display: block;
    padding: 0;
    border: 0;
    border-radius: 16px;
    background: var(--code);
    overflow: hidden;
    cursor: zoom-in;
  }
  .att-img img {
    display: block;
    max-width: min(260px, 70vw);
    max-height: 260px;
    object-fit: cover;
  }
  video {
    display: block;
    max-width: min(320px, 80vw);
    max-height: 260px;
    border-radius: 16px;
    background: #000;
  }
  audio {
    max-width: min(320px, 80vw);
  }
</style>
