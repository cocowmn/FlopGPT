<!-- How the script plays: speeds, spinner and labels, applied as they're changed. -->
<script lang="ts">
  import { untrack } from 'svelte';
  import {
    DEFAULT_IMAGE_LABEL,
    DEFAULT_IMAGE_SECONDS,
    DEFAULT_SECONDS,
    DEFAULT_TYPING_CPS,
    num,
  } from '../../lib/normalize';
  import { setField, store } from '../../lib/stores/config.svelte';
  import Field from '../editor/Field.svelte';

  const cfg = $derived(store.config);
  const text = (key: string) => String(cfg[key] ?? '');

  // Number fields keep their own text, so half-typed numbers like "2." aren't rewritten.
  const numbers = [
    { key: 'charsPerSecond', label: 'Reply speed (characters/s)', placeholder: '90' },
    { key: 'typingCharsPerSecond', label: 'Auto-typing speed (characters/s)', placeholder: String(DEFAULT_TYPING_CPS) },
    { key: 'defaultPendingSeconds', label: 'Seconds per thinking step', placeholder: String(DEFAULT_SECONDS) },
    { key: 'imageSeconds', label: 'Seconds to generate an image', placeholder: String(DEFAULT_IMAGE_SECONDS) },
  ];
  const typed = $state<Record<string, string>>(
    untrack(() => Object.fromEntries(numbers.map(n => [n.key, text(n.key)]))),
  );
  function setNumber(key: string, v: string) {
    typed[key] = v;
    setField(key, num(v, ''));
  }

  // "a, b" is a list of spinners to pick from.
  let spinner = $state(untrack(() => ([] as unknown[]).concat(cfg.spinner ?? []).join(', ')));
  function setSpinner(v: string) {
    spinner = v;
    v = v.trim();
    setField(
      'spinner',
      v.includes(',')
        ? v
            .split(',')
            .map(x => x.trim())
            .filter(Boolean)
        : v,
    );
  }
</script>

<div class="cfg-grid">
  <label class="check wide">
    Stream replies word by word
    <input
      class="switch"
      type="checkbox"
      role="switch"
      checked={cfg.streamResponse !== false}
      disabled={store.locked}
      onchange={e => setField('streamResponse', e.currentTarget.checked ? '' : false)}
    />
  </label>
  {#each numbers as n (n.key)}
    <Field label={n.label}>
      <input
        class="ed-in"
        type="number"
        min="0"
        step="any"
        placeholder={n.placeholder}
        value={typed[n.key]}
        disabled={store.locked}
        oninput={e => setNumber(n.key, e.currentTarget.value)}
      />
    </Field>
  {/each}
  <Field label="Spinner">
    <input
      class="ed-in"
      placeholder="random"
      value={spinner}
      disabled={store.locked}
      oninput={e => setSpinner(e.currentTarget.value)}
    />
  </Field>
  <Field label="Thought label">
    <input
      class="ed-in"
      placeholder={'Thought for {s}s'}
      value={text('thoughtLabel')}
      disabled={store.locked}
      oninput={e => setField('thoughtLabel', e.currentTarget.value)}
    />
  </Field>
  <Field label="While an image generates, show">
    <select
      class="ed-in"
      value={cfg.imageStyle === 'progressive' ? 'progressive' : 'animated'}
      disabled={store.locked}
      onchange={e => setField('imageStyle', e.currentTarget.value === 'progressive' ? 'progressive' : '')}
    >
      <option value="animated">An animated placeholder</option>
      <option value="progressive">Rough drafts that sharpen</option>
    </select>
  </Field>
  <Field label="Image label">
    <input
      class="ed-in"
      placeholder={DEFAULT_IMAGE_LABEL}
      value={text('imageLabel')}
      disabled={store.locked}
      oninput={e => setField('imageLabel', e.currentTarget.value)}
    />
  </Field>
</div>

<style>
  .cfg-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 10px;
    padding-bottom: 16px;
  }
  .cfg-grid :global(.ed-field) {
    margin-top: 0;
  }
  .check {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    font-size: 14px;
    cursor: pointer;
  }
  .check.wide {
    grid-column: 1 / -1;
  }
</style>
