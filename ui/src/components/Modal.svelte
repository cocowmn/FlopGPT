<!-- A <dialog> shown as a modal while `open` is true. -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { ui } from '../lib/stores/ui.svelte';

  let {
    open = $bindable(false),
    class: cls = '',
    label,
    labelledby,
    backdropClose = false,
    onrequestclose,
    onclick,
    children
  }: {
    open?: boolean;
    class?: string;
    label?: string;
    labelledby?: string;
    backdropClose?: boolean; // a click outside the box closes it
    onrequestclose?: () => void; // Escape / backdrop: decide whether to close (e.g. unsaved changes)
    onclick?: (e: MouseEvent) => void;
    children: Snippet;
  } = $props();

  let dlg: HTMLDialogElement;

  $effect(() => {
    if (open && !dlg.open) dlg.showModal();
    else if (!open && dlg.open) dlg.close();
  });

  const close = () => (onrequestclose ? onrequestclose() : (open = false));
</script>

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
