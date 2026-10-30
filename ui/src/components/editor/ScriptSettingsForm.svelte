<script lang="ts">
  import { untrack } from 'svelte';
  import Field from './Field.svelte';
  import TextInput from './TextInput.svelte';
  import AccentField from './AccentField.svelte';
  import LogoField from './LogoField.svelte';
  import ResponseCard from './ResponseCard.svelte';
  import { changed } from './editor.svelte';
  import { DEFAULT_FALLBACK, DEFAULT_SECONDS, DEFAULT_TYPING_CPS, setKey, type EditScript } from '../../lib/normalize';

  let { s }: { s: EditScript } = $props();

  let spinner = $state(untrack(() => ([] as unknown[]).concat(s.spinner ?? []).join(', ')));
  function setSpinner(v: string) {
    spinner = v;
    v = v.trim();
    setKey(s, 'spinner', v.includes(',') ? v.split(',').map(x => x.trim()).filter(Boolean) : v);
  }
</script>

<h3>Settings</h3>
<div class="ed-grid">
  <Field label="App name"><TextInput obj={s} key="appName" placeholder="FlopGPT" /></Field>
  <Field label="Model name"><TextInput obj={s} key="modelName" /></Field>
  <Field label="User name"><TextInput obj={s} key="userName" placeholder="You" /></Field>
  <Field label="Accent color"><AccentField {s} /></Field>
  <Field label="Greeting" wide><TextInput obj={s} key="greeting" /></Field>
  <Field label="Placeholder"><TextInput obj={s} key="placeholder" /></Field>
  <Field label="Disclaimer"><TextInput obj={s} key="disclaimer" /></Field>
  <Field label="Logo"><LogoField {s} /></Field>
  <Field label="Spinner"><input class="ed-in" placeholder="random" value={spinner} oninput={e => setSpinner(e.currentTarget.value)} /></Field>
  <Field label="Thought label"><TextInput obj={s} key="thoughtLabel" placeholder={'Thought for {s}s'} /></Field>
  <Field label="Seconds per step">
    <TextInput obj={s} key="defaultPendingSeconds" number placeholder={String(DEFAULT_SECONDS)} />
  </Field>
  <Field label="Characters per second"><TextInput obj={s} key="charsPerSecond" number placeholder="90" /></Field>
  <Field label="Auto-typing speed (characters/s)">
    <TextInput obj={s} key="typingCharsPerSecond" number placeholder={String(DEFAULT_TYPING_CPS)} />
  </Field>
  <label class="ed-check">
    <input type="checkbox" checked={s.streamResponse !== false} onchange={e => (s.streamResponse = e.currentTarget.checked)} />
    Stream responses
  </label>
  <Field label="After the last response" wide>
    <TextInput obj={s} key="fallback" rows={2} placeholder={DEFAULT_FALLBACK} />
  </Field>
</div>

<h3>Responses</h3>
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

<style>
  .ed-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 10px;
  }
  .ed-check {
    display: flex;
    align-items: center;
    gap: 8px;
    align-self: end;
    padding-bottom: 8px;
    font-size: 14px;
  }
  .ed-check input {
    accent-color: var(--accent);
  }
</style>
