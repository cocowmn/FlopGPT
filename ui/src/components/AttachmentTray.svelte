<!-- Files waiting to be sent, above the text box. -->
<script lang="ts">
  import { chat } from '../lib/stores/chat.svelte';
  import FileChip from './FileChip.svelte';

  let broken = $state<Record<number, boolean>>({}); // thumbnails the browser can't show
</script>

{#if chat.attachments.length}
  <div class="tray">
    {#each chat.attachments as a (a.id)}
      <div class="tray-item">
        {#if a.kind === 'image' && !broken[a.id]}
          <img class="thumb" src={a.url} alt={a.file.name} onerror={() => (broken[a.id] = true)} />
        {:else if a.kind === 'video' && !broken[a.id]}
          <video class="thumb" src={a.url} muted preload="metadata" onerror={() => (broken[a.id] = true)}></video>
        {:else}
          <FileChip file={a.file} tray />
        {/if}
        <button type="button" class="tray-x" aria-label="Remove {a.file.name}" onclick={() => chat.removeAttachment(a)}>
          <svg class="icon"><use href="#i-close" /></svg>
        </button>
      </div>
    {/each}
  </div>
{/if}

<style>
  .tray {
    display: flex;
    gap: 10px;
    padding: 6px 6px 2px;
    overflow-x: auto;
  }
  .tray-item {
    position: relative;
    flex: none;
    animation: rise 0.3s var(--ease) both;
  }
  .thumb {
    display: block;
    width: 64px;
    height: 64px;
    object-fit: cover;
    border-radius: 12px;
    background: var(--code);
  }

  .tray-x {
    position: absolute;
    top: -6px;
    right: -6px;
    display: grid;
    place-items: center;
    width: 20px;
    height: 20px;
    padding: 0;
    border: 2px solid var(--bg);
    border-radius: 50%;
    background: var(--text);
    color: var(--bg);
    cursor: pointer;
  }
  .tray-x .icon {
    width: 10px;
    height: 10px;
    stroke-width: 3.2;
  }
</style>
