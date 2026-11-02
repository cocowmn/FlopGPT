<!-- A <dialog> shown as a modal while `open` is true; or, `windowed`, the whole of a desktop window it closes. -->
<script lang="ts">
  import { getCurrentWindow } from '@tauri-apps/api/window';
  import type { Snippet } from 'svelte';
  import { ui } from '../lib/stores/ui.svelte';

  let {
    open = $bindable(false),
    class: cls = '',
    label,
    labelledby,
    backdropClose = false,
    windowed = false,
    onrequestclose,
    onclick,
    children,
  }: {
    open?: boolean;
    class?: string;
    label?: string;
    labelledby?: string;
    backdropClose?: boolean; // a click outside the box closes it
    windowed?: boolean; // fills its own window (desktop Settings and editor); closing it closes the window
    onrequestclose?: () => void; // Escape / backdrop: decide whether to close (e.g. unsaved changes)
    onclick?: (e: MouseEvent) => void;
    children: Snippet;
  } = $props();

  let dlg = $state<HTMLDialogElement>();

  $effect(() => {
    if (windowed) {
      if (!open) getCurrentWindow().close();
      return;
    }
    if (!dlg) return;
    if (open && !dlg.open) dlg.showModal();
    else if (!open && dlg.open) dlg.close();
  });

  const close = () => (onrequestclose ? onrequestclose() : (open = false));
</script>

<svelte:window
  onkeydown={e => {
    if (windowed && e.key === 'Escape' && !e.defaultPrevented && !document.querySelector('dialog[open]')) close();
  }}
/>

{#if windowed}
  <div class="pane {cls}" role="document" aria-label={label} aria-labelledby={labelledby}>
    {@render children()}
  </div>
{:else}
  <dialog
    bind:this={dlg}
    class={cls}
    aria-label={label}
    aria-labelledby={labelledby}
    onclose={() => {
      open = false;
      ui.focusComposer();
    }}
    oncancel={e => {
      e.preventDefault();
      close();
    }}
    onclick={e => {
      if (backdropClose && e.target === dlg) close();
      onclick?.(e);
    }}
  >
    {@render children()}
  </dialog>
{/if}
