<!-- No avatar beside AI replies: the text simply starts at the left edge, like ChatGPT / Claude. -->
<script lang="ts">
  import { closeOpen, renderMarkdown } from '../lib/markdown';
  import type { AssistantMessage } from '../lib/stores/chat.svelte';
  import MessageActions from './MessageActions.svelte';
  import Thinking from './Thinking.svelte';

  let { msg }: { msg: AssistantMessage } = $props();

  // While streaming, close dangling ** or ` so half-typed formatting doesn't flash raw symbols.
  const html = $derived(renderMarkdown(msg.complete ? msg.full : closeOpen(msg.shown)));
</script>

<div class="msg">
  {#if msg.thinking}<Thinking thinking={msg.thinking} instant={msg.instant} />{/if}
  {#if msg.writing}
    <!-- eslint-disable-next-line svelte/no-at-html-tags -- renderMarkdown escapes the text -->
    <div class="prose" class:instant={msg.instant}>{@html html}</div>
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
