<script lang="ts">
  import ThreadAttachment from './ThreadAttachment.svelte';
  import type { Message } from '../lib/stores/chat.svelte';

  let { msg }: { msg: Extract<Message, { role: 'user' }> } = $props();
</script>

<div class="msg">
  {#if msg.atts.length}
    <div class="atts">
      {#each msg.atts as a (a.id)}<ThreadAttachment {a} />{/each}
    </div>
  {/if}
  {#if msg.text}<div class="bubble">{msg.text}</div>{/if}
</div>

<style>
  .msg {
    align-self: flex-end;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
    max-width: min(85%, 560px);
  }
  .msg .bubble {
    padding: 10px 16px;
    border-radius: 20px;
    background: var(--bubble);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .atts {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
  }
</style>
