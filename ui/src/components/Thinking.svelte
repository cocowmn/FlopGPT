<!-- The pending blurbs: one at a time while thinking, then "Thought for Ns", which expands to the list. -->
<script lang="ts">
  import { tick, untrack } from 'svelte';
  import type { Thinking } from '../lib/stores/chat.svelte';
  import Spinner from './Spinner.svelte';

  let { thinking, instant = false }: { thinking: Thinking; instant?: boolean } = $props();

  let open = $state(false);
  let labels = $state<{ id: number; text: string; out: boolean }[]>(
    untrack(() => (instant ? [{ id: 0, text: thinking.label, out: false }] : [])), // restored: no entrance
  );
  let ids = 0;
  let box = $state<HTMLSpanElement>();
  let width = $state<number>(); // eases to fit each new label, so the chevron glides instead of jumping
  let shown = untrack(() => (instant ? `${thinking.steps.length}|${thinking.done}|${thinking.label}` : '')); // the state last animated in: the effect can re-run (e.g. when a new message is sent) with nothing new

  // Slide the old text up and out while the new text slides up and in.
  $effect(() => {
    const text = thinking.label;
    const key = `${thinking.steps.length}|${thinking.done}|${text}`; // also swap when a step repeats the last one
    if (!text || key === shown) return;
    shown = key;
    untrack(() => {
      for (const old of labels) {
        if (old.out) continue;
        old.out = true;
        setTimeout(() => (labels = labels.filter(l => l.id !== old.id)), 320);
      }
      labels.push({ id: ++ids, text, out: false });
    });
    tick().then(() => {
      const el = box?.lastElementChild; // the label just added
      if (el) width = el.scrollWidth + 1; // +1: scrollWidth rounds, and a hair short would ellipsize
    });
  });
</script>

<div class="thinking" class:live={!thinking.done} class:done={thinking.done} class:instant>
  <button type="button" class="thinking-head" aria-expanded={open} onclick={() => (open = !open)}>
    <Spinner pick={thinking.spinner} done={thinking.done} />
    <span class="think-label" bind:this={box} style:width={width && `${width}px`}>
      {#each labels as l (l.id)}<span class:out={l.out}>{l.text}</span>{/each}
    </span>
    <svg class="icon chev"><use href="#i-chevron" /></svg>
  </button>
  <div class="steps-wrap" class:open>
    <div class="steps-inner">
      <ol class="thinking-steps">
        {#each thinking.steps as step, i (i)}<li>{step}</li>{/each}
      </ol>
    </div>
  </div>
</div>

<style>
  .thinking {
    margin: 0 0 8px;
  }
  .thinking-head {
    /* Block-level, not inline-flex: on a line box its baseline shifts (and the line shrinks) when the spinner is removed. */
    display: flex;
    align-items: center;
    gap: 8px;
    width: fit-content;
    max-width: 100%;
    padding: 4px 0;
    border: 0;
    background: none;
    color: var(--muted);
    font: inherit;
    font-size: 0.95em;
    cursor: pointer;
  }
  .thinking-head:hover {
    color: var(--text);
  }

  .think-label {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    min-width: 0;
    overflow: hidden;
    line-height: 1.6;
    transition: width 0.35s var(--ease);
  }
  .think-label span {
    grid-area: 1 / 1;
    justify-self: start;
    max-width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    animation: blurb-in 0.5s var(--ease) both;
  }
  .think-label span.out {
    max-width: none; /* clipped by the box as it narrows, rather than re-ellipsized mid-exit */
    animation: blurb-out 0.3s ease-in both;
    pointer-events: none;
  }
  .thinking.live .think-label span {
    color: transparent;
    background: linear-gradient(90deg, var(--muted) 0%, var(--text) 50%, var(--muted) 100%) 0 0 / 200% 100%;
    -webkit-background-clip: text;
    background-clip: text;
    animation:
      blurb-in 0.5s var(--ease) both,
      shimmer 1.8s linear infinite;
  }
  .thinking.live .think-label span.out {
    animation:
      blurb-out 0.3s ease-in both,
      shimmer 1.8s linear infinite;
  }

  .thinking.instant :is(.think-label span, .thinking-steps li) {
    animation: none;
  }

  .thinking .chev {
    width: 16px;
    height: 16px;
    transition: transform 0.3s var(--ease);
  }
  .thinking-head[aria-expanded='true'] .chev {
    transform: rotate(180deg);
  }

  /* Expand / collapse the list of steps without a height jump. */
  .steps-wrap {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 0.3s var(--ease);
  }
  .steps-wrap.open {
    grid-template-rows: 1fr;
  }
  .steps-inner {
    min-height: 0;
    overflow: hidden;
  }
  .thinking-steps {
    margin: 6px 0 4px 7px;
    padding: 0 0 0 14px;
    list-style: none;
    border-left: 2px solid var(--line);
    color: var(--muted);
    font-size: 0.92em;
  }
  .thinking-steps li {
    margin: 0.35em 0;
    animation: blurb-in 0.45s var(--ease) both;
  }
</style>
