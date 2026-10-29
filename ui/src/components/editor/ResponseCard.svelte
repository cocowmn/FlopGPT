<script lang="ts">
  import Field from './Field.svelte';
  import TextInput from './TextInput.svelte';
  import RowButtons from './RowButtons.svelte';
  import { changed } from './editor.svelte';
  import { DEFAULT_SECONDS, num, type EditResponse, type EditScript } from '../../lib/normalize';

  let { r, i, s }: { r: EditResponse; i: number; s: EditScript } = $props();

  const defSecs = $derived(num(r.defaultPendingSeconds, num(s.defaultPendingSeconds, DEFAULT_SECONDS)));
</script>

<div class="ed-card">
  <div class="ed-card-head"><strong>Response {i + 1}</strong><RowButtons list={s.responses} {i} /></div>
  <Field label="Prompt (Tab or long-press send to auto-type)"><TextInput obj={r} key="prompt" /></Field>
  <Field label="Thinking steps" group>
    <div class="ed-list">
      {#each r.pending as step, j (step)}
        <div class="ed-row">
          <input class="ed-in" placeholder="Thinking step" bind:value={step.text} />
          <input
            type="number"
            class="ed-in ed-secs"
            min="0"
            step="any"
            placeholder="{defSecs}s"
            title="Seconds on screen (blank = default)"
            value={step.seconds}
            oninput={e => (step.seconds = e.currentTarget.value)}
          />
          <RowButtons list={r.pending} i={j} />
        </div>
      {/each}
    </div>
    <button
      type="button"
      class="link"
      onclick={() => {
        r.pending.push({ text: '', seconds: '' });
        changed();
      }}>+ Add step</button
    >
  </Field>
  <Field label="Response (Markdown)"><TextInput obj={r} key="response" rows={5} /></Field>
</div>

<style>
  .ed-card {
    margin-top: 10px;
    padding: 12px;
    border: 1px solid var(--line);
    border-radius: 12px;
  }
  .ed-card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 14px;
  }
  .ed-secs {
    flex: none;
    width: 72px;
  }
</style>
