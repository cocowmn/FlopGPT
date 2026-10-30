<!-- A text field for obj[key]. A blank field removes the key, so the app default applies again. -->
<script lang="ts">
  import { untrack } from 'svelte';
  import { num, setKey } from '../../lib/normalize';

  let {
    obj,
    key,
    placeholder = '',
    rows = 0,
    number = false,
    class: cls = '',
  }: {
    obj: Record<string, unknown>;
    key: string;
    placeholder?: string;
    rows?: number;
    number?: boolean;
    class?: string;
  } = $props();

  // The field keeps its own text so half-typed numbers like "2." aren't rewritten.
  let text = $state(untrack(() => String(obj[key] ?? '')));

  function oninput(e: Event & { currentTarget: HTMLInputElement | HTMLTextAreaElement }) {
    text = e.currentTarget.value;
    setKey(obj, key, number ? num(text, '') : text);
  }
</script>

{#if rows}
  <textarea class="ed-in {cls}" {rows} {placeholder} value={text} {oninput}></textarea>
{:else if number}
  <input class="ed-in {cls}" type="number" min="0" step="any" {placeholder} value={text} {oninput} />
{:else}
  <input class="ed-in {cls}" {placeholder} value={text} {oninput} />
{/if}
