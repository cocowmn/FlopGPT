<!-- Move up / down / remove for one item of an editor list. -->
<script lang="ts">
  import { changed } from './editor.svelte';

  let { list, i }: { list: unknown[]; i: number } = $props();

  function move(d: number) {
    [list[i], list[i + d]] = [list[i + d], list[i]];
    changed();
  }
  function remove() {
    list.splice(i, 1);
    changed();
  }
</script>

<span class="ed-row-btns">
  <button type="button" class="ed-mini" title="Move up" aria-label="Move up" disabled={i === 0} onclick={() => move(-1)}>↑</button>
  <button type="button" class="ed-mini" title="Move down" aria-label="Move down" disabled={i === list.length - 1} onclick={() => move(1)}>↓</button>
  <button type="button" class="ed-mini" title="Remove" aria-label="Remove" onclick={remove}>✕</button>
</span>

<style>
  .ed-row-btns {
    display: flex;
    flex: none;
    gap: 2px;
  }
  .ed-mini {
    width: 28px;
    height: 28px;
    padding: 0;
    border: 0;
    border-radius: 7px;
    background: none;
    color: var(--muted);
    font-size: 14px;
    cursor: pointer;
  }
  .ed-mini:hover:not(:disabled) {
    background: var(--hover);
    color: var(--text);
  }
  .ed-mini:disabled {
    opacity: 0.3;
    cursor: default;
  }
</style>
