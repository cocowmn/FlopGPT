<script lang="ts">
  import { DEFAULT_FALLBACK, type EditScript } from '../../lib/normalize';
  import Field from './Field.svelte';
  import ResponseCard from './ResponseCard.svelte';
  import TextInput from './TextInput.svelte';
  import { changed } from './editor.svelte';

  let { s }: { s: EditScript } = $props();
</script>

<!-- Speeds, spinner and labels are on the settings' Conversation tab. -->
<Field label="After the last response">
  <TextInput obj={s} key="fallback" rows={2} placeholder={DEFAULT_FALLBACK} />
</Field>

<h3>Script</h3>
{#each s.responses as r, i (r)}
  <ResponseCard {r} {i} {s} />
{/each}
<button
  type="button"
  class="btn ed-add"
  onclick={() => {
    s.responses.push({ pending: [], response: '' });
    changed();
  }}>+ Add response</button
>
