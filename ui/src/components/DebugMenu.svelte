<!-- The performer's hidden menu on the + button: unsend the last prompt, or jump to any response. -->
<script lang="ts">
  import { chat } from '../lib/stores/chat.svelte';
  import { ui } from '../lib/stores/ui.svelte';

  const WIDTH = 280;
  let jumping = $state(false);
  let menu = $state<HTMLDivElement>();

  const at = $derived(ui.debugMenu);
  const left = $derived(at ? Math.max(8, Math.min(at.x, innerWidth - WIDTH - 8)) : 0);
  const bottom = $derived(at ? innerHeight - at.y + 8 : 0);

  $effect(() => {
    if (!at) return;
    jumping = false;
    menu?.querySelector('button')?.focus();
  });

  function close() {
    ui.debugMenu = null;
    ui.focusComposer();
  }
  function run(fn: () => void) {
    fn();
    close();
  }
  function onpointerdown(e: PointerEvent) {
    if (at && !menu?.contains(e.target as Node)) close();
  }
  function onkeydown(e: KeyboardEvent) {
    if (at && e.key === 'Escape') close();
  }
</script>

<svelte:window {onpointerdown} {onkeydown} onblur={() => at && close()} />

{#if at}
  <div class="menu" role="menu" bind:this={menu} style:left="{left}px" style:bottom="{bottom}px" style:width="{WIDTH}px">
    <button type="button" role="menuitem" disabled={!chat.messages.length} onclick={() => run(() => chat.undo())}>
      Undo last prompt
    </button>
    <button
      type="button"
      role="menuitem"
      aria-expanded={jumping}
      disabled={!chat.turns.length}
      onclick={() => (jumping = !jumping)}
    >
      Jump to Response
      <svg class="icon chev" class:open={jumping}><use href="#i-chevron" /></svg>
    </button>
    {#if jumping}
      <div class="list">
        {#each chat.turns as t (t.n)}
          <button type="button" role="menuitem" onclick={() => run(() => chat.jumpTo(t.n))}>
            <span class="n">{t.n}:</span><span class="label">{t.label.slice(0, 80)}</span>
          </button>
        {/each}
      </div>
    {/if}
  </div>
{/if}

<style>
  .menu {
    position: fixed;
    z-index: 40; /* above the composer, below the toast */
    display: flex;
    flex-direction: column;
    max-width: calc(100vw - 16px);
    padding: 6px;
    border: 1px solid var(--line);
    border-radius: 14px;
    background: var(--bg);
    box-shadow: 0 8px 28px rgba(0, 0, 0, 0.18);
    -webkit-touch-callout: none;
    user-select: none;
  }
  .menu button {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 10px;
    border: 0;
    border-radius: 8px;
    background: none;
    color: inherit;
    font: inherit;
    font-size: 15px;
    text-align: left;
    cursor: pointer;
  }
  .menu button:hover:not(:disabled),
  .menu button:focus-visible {
    background: var(--bubble);
    outline: 0;
  }
  .menu button:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .chev {
    width: 16px;
    height: 16px;
    margin-left: auto;
    transition: transform 0.2s var(--ease);
  }
  .chev.open {
    transform: rotate(180deg);
  }
  .list {
    display: flex;
    flex-direction: column;
    max-height: 50vh;
    margin-top: 4px;
    padding-top: 4px;
    border-top: 1px solid var(--line);
    overflow-y: auto;
  }
  .n {
    flex: none;
    color: var(--muted);
  }
  .label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
