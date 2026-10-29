<script lang="ts">
  import { fmtSize } from '../lib/files';

  let { file, tray = false }: { file: File; tray?: boolean } = $props();

  const ext = $derived((file.name.match(/\.([^.]+)$/)?.[1] ?? 'file').toUpperCase().slice(0, 5));
</script>

<div class="file-chip" class:tray>
  <svg class="icon"><use href="#i-file" /></svg>
  <span class="fc-text">
    <span class="fc-name">{file.name}</span>
    <span class="fc-meta">{ext} · {fmtSize(file.size)}</span>
  </span>
</div>

<style>
  .file-chip {
    display: flex;
    align-items: center;
    gap: 10px;
    max-width: 240px;
    min-height: 64px;
    padding: 10px 14px 10px 12px;
    border: 1px solid var(--line);
    border-radius: 14px;
    background: var(--bg);
    text-align: left;
  }
  .file-chip > .icon {
    color: var(--muted);
  }
  .fc-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
    line-height: 1.3;
  }
  .fc-name {
    font-size: 14px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .fc-meta {
    font-size: 12px;
    color: var(--muted);
  }
  .file-chip.tray {
    height: 64px;
  }
</style>
