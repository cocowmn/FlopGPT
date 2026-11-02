<!-- No avatar beside AI replies: the text simply starts at the left edge, like ChatGPT / Claude. -->
<script lang="ts">
  import { closeOpen, renderBlocks } from '../lib/markdown';
  import type { AssistantMessage } from '../lib/stores/chat.svelte';
  import { ui } from '../lib/stores/ui.svelte';
  import ImageGen from './ImageGen.svelte';
  import MessageActions from './MessageActions.svelte';
  import Thinking from './Thinking.svelte';

  let { msg }: { msg: AssistantMessage } = $props();

  // While streaming, close dangling ** or ` so half-typed formatting doesn't flash raw symbols.
  const blocks = $derived(renderBlocks(msg.complete ? msg.full : closeOpen(msg.shown)));

  // A click on an image in the reply opens it larger.
  function zoom(e: MouseEvent) {
    const img = (e.target as Element).closest('img');
    if (img && !img.closest('a')) ui.lightbox = { src: img.src, alt: img.alt };
  }
</script>

<div class="msg">
  {#if msg.thinking}<Thinking thinking={msg.thinking} instant={msg.instant} />{/if}
  {#if msg.image}<ImageGen image={msg.image} instant={msg.instant} />{/if}
  {#if msg.writing}
    <!-- Each block is its own {@html}, so finished blocks (and their images) aren't rebuilt as the reply streams. -->
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div class="prose" class:instant={msg.instant} onclick={zoom}>
      <!-- eslint-disable-next-line svelte/no-at-html-tags -- renderBlocks escapes the text -->
      {#each blocks as block, i (i)}{@html block}{/each}
    </div>
  {/if}
  <MessageActions text={msg.full} ready={msg.complete} instant={msg.instant} />
</div>

<style>
  .msg {
    min-width: 0;
  }
  .prose.instant {
    animation: none;
  }
</style>
