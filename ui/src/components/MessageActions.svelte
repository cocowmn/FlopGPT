<script lang="ts">
  import Logo from './Logo.svelte';
  import { ui } from '../lib/stores/ui.svelte';

  // Rendered (but hidden) for the whole reply so its row is already there when it fades in.
  let { text, ready = true }: { text: string; ready?: boolean } = $props();
  let rating = $state<'up' | 'down' | null>(null);

  function copy() {
    navigator.clipboard?.writeText(text).then(
      () => ui.toast('Copied to clipboard'),
      () => {}
    );
  }
  const rate = (r: 'up' | 'down') => (rating = rating === r ? null : r);
</script>

<div class="actions" class:ready inert={!ready}>
  <button class="icon-btn" type="button" aria-label="Copy" onclick={copy}><svg class="icon"><use href="#i-copy" /></svg></button>
  <button class="icon-btn" class:on={rating === 'up'} type="button" aria-label="Good response" aria-pressed={rating === 'up'} onclick={() => rate('up')}>
    <svg class="icon"><use href="#i-up" /></svg>
  </button>
  <button class="icon-btn" class:on={rating === 'down'} type="button" aria-label="Bad response" aria-pressed={rating === 'down'} onclick={() => rate('down')}>
    <svg class="icon"><use href="#i-down" /></svg>
  </button>
  <Logo class="actions-logo" />
</div>

<style>
  .actions {
    display: flex;
    align-items: center;
    gap: 2px;
    margin: 8px 0 0 -8px;
    opacity: 0;
    translate: 0 6px;
    visibility: hidden;
    transition:
      opacity 0.4s var(--ease),
      translate 0.4s var(--ease),
      visibility 0.4s;
  }
  .actions.ready {
    opacity: 1;
    translate: none;
    visibility: visible;
  }
  .actions .icon-btn {
    width: 32px;
    height: 32px;
  }
  .actions .icon {
    width: 16px;
    height: 16px;
  }
  .actions .icon-btn.on {
    color: var(--accent);
  }
  .actions :global(.actions-logo) {
    width: 18px;
    height: 18px;
    margin: 0 4px 0 auto;
    color: var(--accent);
  }
  .actions :global(.actions-logo .icon) {
    width: 18px;
    height: 18px;
  }
</style>
