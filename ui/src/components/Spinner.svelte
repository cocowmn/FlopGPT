<!-- A random animated spinner (always in the accent color) shows while thinking; it folds away when done. -->
<script lang="ts">
  import { reduceMotion } from '../lib/stores/ui.svelte';
  import type { SpinnerPick } from '../lib/types';

  let { pick, done }: { pick: SpinnerPick; done: boolean } = $props();

  let el = $state<HTMLSpanElement>();
  let gone = $state(false);

  $effect(() => {
    if (!done) return;
    const t = setTimeout(() => (gone = true), 500); // after it has folded away
    return () => clearTimeout(t);
  });

  $effect(() => {
    if (reduceMotion.current) el?.querySelector('svg')?.pauseAnimations?.();
  });
</script>

{#if !gone && pick.type === 'svg'}
  <!-- eslint-disable svelte/no-at-html-tags -- spinner SVG from spinners.ts or the user's own config -->
  <span class="spin" class:done bind:this={el} data-spinner={pick.name} style:--w="{pick.w}px" style:--h="{pick.h}px"
    >{@html pick.html}</span
  >
  <!-- eslint-enable svelte/no-at-html-tags -->
{:else if !gone && pick.type === 'logo'}
  <span class="spin logo" class:done class:live={!done} style:--w="16px" style:--h="16px">
    <svg class="icon"><use href="#i-logo" /></svg>
  </span>
{/if}

<style>
  .spin {
    display: grid;
    place-items: center;
    flex: none;
    overflow: hidden;
    width: var(--w);
    height: 24px;
    color: var(--accent);
    transition:
      width 0.35s var(--ease),
      margin 0.35s var(--ease),
      opacity 0.25s ease;
  }
  .spin :global(svg) {
    display: block;
    flex: none;
    width: var(--w);
    height: var(--h);
    fill: currentColor;
    opacity: 0.7;
    scale: 0.8 0.8;
  }
  .spin.logo.live svg {
    animation: pulse 1.4s ease-in-out infinite;
  }
  .spin.done {
    width: 0;
    margin-right: -8px;
    opacity: 0;
  }
</style>
