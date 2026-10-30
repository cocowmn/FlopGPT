<script lang="ts">
  import { onMount } from 'svelte';
  import { chat } from '../lib/stores/chat.svelte';
  import { store } from '../lib/stores/config.svelte';
  import { ui } from '../lib/stores/ui.svelte';
  import AssistantMessage from './AssistantMessage.svelte';
  import Logo from './Logo.svelte';
  import UserMessage from './UserMessage.svelte';

  let scroller: HTMLDivElement;

  onMount(() => ui.onScroll(() => (scroller.scrollTop = scroller.scrollHeight)));

  function onscroll() {
    ui.pinned = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 80;
  }
</script>

<div class="scroller" bind:this={scroller} {onscroll}>
  <div class="chat" aria-live="polite">
    {#each chat.messages as msg (msg.id)}
      {#if msg.role === 'user'}
        <UserMessage {msg} />
      {:else}
        <AssistantMessage {msg} />
      {/if}
    {:else}
      <div class="empty">
        <div class="avatar big"><Logo /></div>
        <h1>{store.brand.greeting}</h1>
      </div>
    {/each}
  </div>
</div>

<style>
  .scroller {
    flex: 1;
    overflow-y: auto;
    overscroll-behavior: contain;
  }
  .chat {
    display: flex;
    flex-direction: column;
    gap: 22px;
    min-height: 100%;
    max-width: var(--maxw);
    margin: 0 auto;
    padding: 12px 16px 24px;
  }
  .empty {
    margin: auto;
    text-align: center;
    padding: 0 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .empty h1 {
    margin: 0;
    font-size: clamp(1.5rem, 4vw, 2rem);
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  @media (max-width: 600px) {
    .chat {
      padding: 8px 14px 20px;
      gap: 18px;
    }
  }
</style>
