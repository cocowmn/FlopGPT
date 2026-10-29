<script lang="ts">
  import { ui } from '../lib/stores/ui.svelte';
</script>

<div class="toast" class:show={ui.toastShown} role="status" aria-live="polite">{ui.toastMsg}</div>

<style>
  .toast {
    position: fixed;
    left: 50%;
    bottom: calc(96px + env(safe-area-inset-bottom));
    z-index: 50;
    max-width: calc(100% - 32px);
    padding: 10px 16px;
    border-radius: 12px;
    background: var(--text);
    color: var(--bg);
    font-size: 14px;
    transform: translate(-50%, 8px);
    opacity: 0;
    pointer-events: none;
    transition:
      opacity 0.2s,
      transform 0.2s;
  }
  .toast.show {
    opacity: 1;
    transform: translate(-50%, 0);
  }
</style>
