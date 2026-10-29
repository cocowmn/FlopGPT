<!-- An image chosen in Settings is a long data URL: show a note instead of the text. -->
<script lang="ts">
  import TextInput from './TextInput.svelte';
  import { changed } from './editor.svelte';
  import type { EditScript } from '../../lib/normalize';

  let { s }: { s: EditScript } = $props();
</script>

{#if String(s.logo ?? '').startsWith('data:')}
  <span class="ed-note">
    Image chosen in Settings ·
    <button
      type="button"
      class="link"
      onclick={() => {
        delete s.logo;
        changed();
      }}>Remove</button
    >
  </span>
{:else}
  <TextInput obj={s} key="logo" placeholder="my-logo.png" />
{/if}
