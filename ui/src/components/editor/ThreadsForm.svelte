<script lang="ts">
  import type { EditThreadItem } from '../../lib/normalize';
  import RowButtons from './RowButtons.svelte';
  import { changed } from './editor.svelte';

  let { items }: { items: EditThreadItem[] } = $props();

  function add(item: EditThreadItem) {
    items.push(item);
    changed();
  }
</script>

<h3>Old conversations</h3>
<p class="ed-note">Headings (bold) group the chats below them in the sidebar.</p>
<div class="ed-list">
  {#each items as it, i (it)}
    <div class="ed-row">
      {#if 'group' in it}
        <input class="ed-in ed-heading" placeholder="Heading, e.g. Yesterday" bind:value={it.group} />
      {:else}
        <input class="ed-in" placeholder="Chat title" bind:value={it.title} />
      {/if}
      <RowButtons list={items} {i} />
    </div>
  {/each}
</div>
<div class="set-btns">
  <button type="button" class="btn ed-add" onclick={() => add({ title: '' })}>+ Add chat</button>
  <button type="button" class="btn ed-add" onclick={() => add({ group: '' })}>+ Add heading</button>
</div>

<style>
  .ed-heading {
    font-weight: 600;
  }
</style>
