<!-- The old conversations: cosmetic, but clickable and searchable. -->
<script lang="ts">
  import { store } from '../lib/stores/config.svelte';
  import { ui } from '../lib/stores/ui.svelte';

  const shown = $derived.by(() => {
    const q = ui.search.trim().toLowerCase();
    return store.threads
      .map((t, i) => ({ ...t, i }))
      .filter(t => !q || t.title.toLowerCase().includes(q))
      .map((t, n, list) => ({ ...t, heading: n === 0 || list[n - 1].group !== t.group }));
  });

  function pick(i: number) {
    ui.activeThread = i;
    ui.closeSidebarIfNarrow();
  }
</script>

<nav class="threads" aria-label="Previous chats">
  {#each shown as t (t.i)}
    {#if t.heading}<div class="group">{t.group}</div>{/if}
    <button type="button" class="thread" class:active={t.i === ui.activeThread} title={t.title} onclick={() => pick(t.i)}>
      {t.title}
    </button>
  {:else}
    <div class="no-results">{store.threads.length ? 'No matching chats' : 'No conversations yet'}</div>
  {/each}
</nav>

<style>
  .threads {
    flex: 1;
    overflow-y: auto;
    margin: 4px -4px 0;
    padding: 0 4px;
  }
  .group {
    padding: 14px 10px 4px;
    font-size: 12px;
    font-weight: 600;
    color: var(--muted);
  }
  .thread {
    display: block;
    width: 100%;
    padding: 8px 10px;
    border: 0;
    border-radius: 10px;
    background: none;
    color: var(--text);
    font: inherit;
    font-size: 15px;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    cursor: pointer;
  }
  .thread:hover {
    background: var(--hover);
  }
  .thread.active {
    background: var(--bubble);
  }
  .no-results {
    padding: 14px 10px;
    color: var(--muted);
    font-size: 14px;
  }
</style>
