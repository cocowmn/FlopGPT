<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    label,
    wide = false,
    group = false, // several inputs: a <div> instead of a <label>
    children,
  }: { label: string; wide?: boolean; group?: boolean; children: Snippet } = $props();
</script>

<svelte:element this={group ? 'div' : 'label'} class="ed-field" class:wide>
  <span>{label}</span>
  {@render children()}
</svelte:element>

<style>
  .ed-field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
    margin-top: 10px;
  }
  :global(.ed-grid) .ed-field {
    margin-top: 0;
  }
  .ed-field.wide {
    grid-column: 1 / -1;
  }
  .ed-field > span {
    font-size: 12px;
    color: var(--muted);
  }
  .ed-field :global(.link) {
    align-self: flex-start;
    font-size: 13px;
  }
</style>
