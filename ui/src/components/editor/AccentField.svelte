<!-- The accent color: a text field (any CSS color) plus a swatch picker for hex colors. -->
<script lang="ts">
  import { untrack } from 'svelte';
  import { setKey, type EditScript } from '../../lib/normalize';

  let { s }: { s: EditScript } = $props();

  let text = $state(untrack(() => String(s.accent ?? '')));
  let swatch = $state('#5b5bd6');
  $effect(() => {
    if (/^#[0-9a-f]{6}$/i.test(text)) swatch = text;
  });

  function set(v: string) {
    text = v;
    setKey(s, 'accent', v);
  }
</script>

<span class="ed-color">
  <input type="color" class="ed-swatch" aria-label="Pick accent color" value={swatch} oninput={e => set(e.currentTarget.value)} />
  <input class="ed-in" placeholder="#5b5bd6" value={text} oninput={e => set(e.currentTarget.value)} />
</span>

<style>
  .ed-color {
    display: flex;
    gap: 6px;
  }
  .ed-swatch {
    flex: none;
    width: 36px;
    height: 34px;
    padding: 2px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--bg);
    cursor: pointer;
  }
</style>
