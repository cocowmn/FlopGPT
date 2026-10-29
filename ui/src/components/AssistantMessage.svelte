<!-- No avatar beside AI replies: the text simply starts at the left edge, like ChatGPT / Claude. -->
<script lang="ts">
  import Thinking from './Thinking.svelte';
  import MessageActions from './MessageActions.svelte';
  import { closeOpen, renderMarkdown } from '../lib/markdown';
  import type { AssistantMessage } from '../lib/stores/chat.svelte';

  let { msg }: { msg: AssistantMessage } = $props();

  // While streaming, close dangling ** or ` so half-typed formatting doesn't flash raw symbols.
  const html = $derived(renderMarkdown(msg.complete ? msg.full : closeOpen(msg.shown)));
</script>

<div class="msg">
  {#if msg.thinking}<Thinking thinking={msg.thinking} />{/if}
  {#if msg.writing}
    <div class="prose">{@html html}</div>
  {/if}
  <MessageActions text={msg.full} ready={msg.complete} />
</div>

<style>
  .msg {
    min-width: 0;
  }
</style>
