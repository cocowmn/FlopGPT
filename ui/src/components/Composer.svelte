<script lang="ts">
  import { onMount } from 'svelte';
  import { chat } from '../lib/stores/chat.svelte';
  import { store } from '../lib/stores/config.svelte';
  import { ui } from '../lib/stores/ui.svelte';
  import AttachmentTray from './AttachmentTray.svelte';

  let input: HTMLTextAreaElement;
  let picker: HTMLInputElement;

  onMount(() => ui.onFocusComposer(() => input.focus()));

  // While a long-press would auto-type, swallow the touch so iOS doesn't show its loupe or
  // Paste callout; a short tap still focuses the box. Svelte's ontouchstart is passive,
  // hence addEventListener.
  onMount(() => {
    let swallowed = false;
    const start = (e: TouchEvent) => {
      swallowed = armed();
      if (swallowed) e.preventDefault();
    };
    const end = () => {
      if (swallowed && !longFired) input.focus();
      swallowed = false;
    };
    input.addEventListener('touchstart', start, { passive: false });
    input.addEventListener('touchend', end);
    return () => {
      input.removeEventListener('touchstart', start);
      input.removeEventListener('touchend', end);
    };
  });

  // Grow with the text, up to 200px.
  $effect(() => {
    void chat.input;
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 200) + 'px';
  });

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      chat.submit();
    } else if (e.key === 'Tab' && !e.shiftKey && !e.altKey && !chat.input && !chat.typing && chat.nextPrompt) {
      e.preventDefault();
      chat.autoType();
    }
  }

  function onpaste(e: ClipboardEvent) {
    const files = [...(e.clipboardData?.files || [])];
    if (files.length) {
      e.preventDefault();
      chat.addFiles(files);
    }
  }

  function picked() {
    chat.addFiles([...(picker.files ?? [])]);
    picker.value = '';
  }

  // Long-press the empty message box (when the script has a prompt ready) to "type" that
  // prompt: the touch-friendly version of pressing Tab. Then tap send to submit.
  let pressTimer = 0,
    longFired = false;

  const armed = () => !chat.busy && !chat.typing && !chat.input && !!chat.nextPrompt;

  function onpointerdown(e: PointerEvent) {
    longFired = false;
    if (e.button > 0 || !armed()) return;
    pressTimer = window.setTimeout(() => {
      longFired = true;
      navigator.vibrate?.(20);
      chat.autoType();
    }, 450);
  }
  function cancelPress() {
    clearTimeout(pressTimer);
  }
  // Don't open the context menu for the press that just started typing.
  function oncontextmenu(e: MouseEvent) {
    if (longFired) e.preventDefault();
  }

  // Sending is still refused while the prompt types itself out, but the button doesn't look disabled.
  const sendable = $derived(chat.canSend || (chat.typing && !chat.busy));
</script>

<form
  class="composer"
  autocomplete="off"
  onsubmit={e => {
    e.preventDefault();
    chat.submit();
  }}
>
  <div class="box">
    <AttachmentTray />
    <div class="row">
      <button class="icon-btn attach" type="button" aria-label="Add photos or files" onclick={() => picker.click()}>
        <svg class="icon"><use href="#i-plus" /></svg>
      </button>
      <textarea
        bind:this={input}
        bind:value={chat.input}
        rows="1"
        placeholder={store.brand.placeholder}
        enterkeyhint="send"
        aria-label="Message"
        {onkeydown}
        {onpaste}
        {onpointerdown}
        onpointerup={cancelPress}
        onpointerleave={cancelPress}
        onpointercancel={cancelPress}
        {oncontextmenu}></textarea>
      <button class="send" type="submit" aria-label="Send message" disabled={!sendable}>
        <svg class="icon"><use href="#i-send" /></svg>
      </button>
    </div>
  </div>
  {#if store.brand.disclaimer}<p class="disclaimer">{store.brand.disclaimer}</p>{/if}
  <input
    bind:this={picker}
    type="file"
    accept="image/*,video/*,audio/*,application/pdf,text/*"
    multiple
    hidden
    onchange={picked}
  />
</form>

<style>
  .composer {
    flex: none;
    width: 100%;
    max-width: var(--maxw);
    margin: 0 auto;
    padding: 8px 16px calc(10px + env(safe-area-inset-bottom));
  }
  .box {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px;
    border: 1px solid var(--line);
    border-radius: 26px;
    background: var(--bg);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  }
  .box:focus-within {
    border-color: color-mix(in srgb, var(--accent) 55%, var(--line));
  }
  .row {
    display: flex;
    align-items: flex-end;
    gap: 6px;
  }
  .row textarea {
    flex: 1;
    min-width: 0;
    max-height: 200px;
    padding: 6px 4px;
    border: 0;
    outline: 0;
    resize: none;
    background: none;
    color: inherit;
    font: inherit;
    font-size: 16px;
    line-height: 1.5; /* 16px stops iOS zoom-on-focus */
  }
  .attach {
    width: 36px;
    height: 36px;
    border-radius: 50%;
  }
  .attach .icon {
    width: 22px;
    height: 22px;
  }
  .send {
    display: grid;
    place-items: center;
    flex: none;
    width: 36px;
    height: 36px;
    border: 0;
    border-radius: 50%;
    background: var(--accent);
    color: var(--accent-text);
    cursor: pointer;
  }
  .send .icon {
    stroke-width: 2.2;
  }
  .send:disabled {
    opacity: 0.35;
    cursor: default;
  }
  .disclaimer {
    margin: 8px 0 0;
    text-align: center;
    font-size: 12px;
    color: var(--muted);
  }

  @media (max-width: 600px) {
    .composer {
      padding-left: 12px;
      padding-right: 12px;
    }
  }
</style>
