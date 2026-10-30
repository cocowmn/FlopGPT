<!-- Every image the config can brand, each previewed the way it shows up in the app. -->
<script lang="ts">
  import { IMAGE_SLOTS, type ImageKey } from '../../lib/images';
  import {
    exportImages,
    imageFailed,
    resetImages,
    setImageFile,
    shown,
    store,
    useLargeLogo,
  } from '../../lib/stores/config.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import Modal from '../Modal.svelte';

  let picker: HTMLInputElement;
  let target: ImageKey = 'logo'; // the row whose file picker is open
  let over = $state<ImageKey | null>(null); // the row a file is dragged over
  let busy = $state<ImageKey | null>(null);
  let zipping = $state(false);

  // Spots that aren't as they started: their own image, or kept off the large logo.
  const changedKeys = $derived(
    IMAGE_SLOTS.filter(s => store.images[s.key].own || store.images[s.key].optedOut).map(s => s.key),
  );

  function status(key: ImageKey) {
    const im = store.images[key];
    if (im.src && !shown(im.src)) return { text: "Couldn't load", tone: 'bad' };
    if (im.own) return { text: 'Custom', tone: 'custom' };
    if (im.inherited) return { text: 'Uses large logo', tone: '' };
    if (im.optedOut && store.images.logo.own) return { text: 'Uses default', tone: '' };
    return { text: 'Default', tone: '' };
  }

  // With a large logo set, a spot without its own image can switch between it and its default.
  const canSwap = (key: ImageKey) =>
    !store.locked &&
    key !== 'logo' &&
    !store.images[key].own &&
    (store.images[key].inherited || store.images[key].optedOut) &&
    !!store.images.logo.own;

  function choose(key: ImageKey) {
    target = key;
    picker.click();
  }
  async function use(key: ImageKey, file: File) {
    busy = key;
    await setImageFile(key, file);
    busy = null;
  }
  async function picked() {
    const f = picker.files?.[0];
    picker.value = '';
    if (f) await use(target, f);
  }

  /* Drop an image on a row to use it there (and not as a chat attachment). */
  function ondragover(e: DragEvent, key: ImageKey) {
    if (store.locked || !e.dataTransfer || ![...e.dataTransfer.types].includes('Files')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    over = key;
  }
  function ondragleave(e: DragEvent, key: ImageKey) {
    if (over === key && !(e.currentTarget as Node).contains(e.relatedTarget as Node)) over = null;
  }
  function ondrop(e: DragEvent, key: ImageKey) {
    e.preventDefault();
    e.stopPropagation();
    over = null;
    if (store.locked) return;
    const file = [...(e.dataTransfer?.files ?? [])].find(f => f.type.startsWith('image/'));
    if (file) use(key, file);
    else ui.toast('Please drop an image file.');
  }

  async function download() {
    zipping = true;
    await exportImages();
    zipping = false;
  }

  async function resetAll() {
    if (await ui.confirm('Put every image back to its default?', 'Reset all')) resetImages(changedKeys);
  }
</script>

<!-- How each image looks where the app shows it. -->
{#snippet preview(key: ImageKey)}
  {@const im = store.images[key]}
  {@const src = shown(im.src)}
  {@const onerror = () => imageFailed(key, im.src)}
  {#if key === 'logo'}
    {#if src}<img class="p-large" {src} alt="" {onerror} />{:else}<span class="p-mark p-large-mark"
        ><svg class="icon"><use href="#i-logo" /></svg></span
      >{/if}
  {:else if key === 'appIcon'}
    <span class="p-app" class:fill={src && !im.inherited} class:plain={!src}>
      {#if src}<img {src} alt="" {onerror} />{:else}<svg class="icon"><use href="#i-logo" /></svg>{/if}
    </span>
  {:else if key === 'favicon'}
    <span class="p-tab">
      {#if src}<img {src} alt="" {onerror} />{:else}<svg class="icon fav-default"><use href="#i-logo" /></svg>{/if}
      <i></i>
    </span>
  {:else if key === 'userAvatar'}
    {#if src}<img class="p-user" {src} alt="" {onerror} />{:else}<span class="p-user">{store.brand.initial}</span>{/if}
  {:else}
    <span class="p-small" class:tiny={key === 'threadAvatar'}>
      {#if src}<img {src} alt="" {onerror} />{:else}<svg class="icon"><use href="#i-logo" /></svg>{/if}
    </span>
  {/if}
{/snippet}

<Modal class="images" labelledby="imagesTitle" backdropClose bind:open={ui.imagesOpen}>
  <div class="dlg">
    <header>
      <h2 id="imagesTitle">Images</h2>
      <button class="icon-btn" type="button" aria-label="Close" onclick={() => (ui.imagesOpen = false)}>
        <svg class="icon"><use href="#i-close" /></svg>
      </button>
    </header>
    <p class="lead">Click a preview or drop an image on a row to replace it. PNG, JPG, WebP, GIF or SVG.</p>

    <ul class="img-list">
      {#each IMAGE_SLOTS as slot (slot.key)}
        {@const st = status(slot.key)}
        {@const own = !!store.images[slot.key].own}
        <li
          class="img-row"
          class:over={over === slot.key}
          ondragover={e => ondragover(e, slot.key)}
          ondragleave={e => ondragleave(e, slot.key)}
          ondrop={e => ondrop(e, slot.key)}
        >
          <button
            class="pv"
            class:side={slot.key === 'smallLogo' || slot.key === 'userAvatar'}
            class:busy={busy === slot.key}
            type="button"
            disabled={store.locked}
            aria-label="Upload {slot.label.toLowerCase()}"
            onclick={() => choose(slot.key)}
          >
            {@render preview(slot.key)}
            <span class="pv-cover" aria-hidden="true"><svg class="icon"><use href="#i-upload" /></svg></span>
          </button>
          <div class="img-text">
            <div class="img-title">
              <strong>{slot.label}</strong>
              {#if canSwap(slot.key)}
                {@const on = store.images[slot.key].inherited}
                <button
                  class="pill swap"
                  type="button"
                  title={on ? 'Use the default here instead' : 'Use the large logo here instead'}
                  onclick={() => useLargeLogo(slot.key, !on)}
                  >{st.text}<svg class="icon" aria-hidden="true"><use href="#i-swap" /></svg></button
                >
              {:else}
                <span class="pill {st.tone}">{st.text}</span>
              {/if}
            </div>
            <p>{slot.hint}{slot.key === 'userAvatar' ? '. Your initial if none is set' : ''}</p>
          </div>
          <div class="img-btns">
            <button class="btn" type="button" disabled={store.locked} onclick={() => choose(slot.key)}>Upload…</button>
            <button
              class="btn"
              type="button"
              disabled={store.locked || !own}
              title={own ? undefined : 'Already the default'}
              onclick={() => resetImages([slot.key])}>Reset</button
            >
          </div>
        </li>
      {/each}
    </ul>

    {#if store.locked}<p class="lead note">{store.saveNote}</p>{/if}
    <div class="img-foot">
      <button class="btn" type="button" disabled={store.locked || !changedKeys.length} onclick={resetAll}
        >Reset all</button
      >
      <div class="img-foot-end">
        <button
          class="btn dl"
          class:busy={zipping}
          type="button"
          aria-label="Download all images (.zip)"
          title="Download all images (.zip)"
          disabled={zipping}
          onclick={download}><svg class="icon"><use href="#i-download" /></svg></button
        >
        <button class="btn primary" type="button" onclick={() => (ui.imagesOpen = false)}>Done</button>
      </div>
    </div>
  </div>
</Modal>

<input bind:this={picker} type="file" accept="image/*" hidden onchange={picked} />

<style>
  .lead {
    margin: 0 0 12px;
    font-size: 13px;
    color: var(--muted);
  }
  .lead.note {
    margin: 12px 0 0;
  }

  .img-list {
    margin: 0 -20px;
    padding: 0;
    list-style: none;
    border-top: 1px solid var(--line);
  }
  .img-row {
    display: grid;
    grid-template-columns: 64px minmax(0, 1fr) auto;
    align-items: center;
    gap: 14px;
    padding: 12px 20px;
    border-bottom: 1px solid var(--line);
    transition:
      background 0.15s ease,
      box-shadow 0.15s ease;
  }
  .img-row.over {
    background: color-mix(in srgb, var(--accent) 7%, transparent);
    box-shadow: inset 0 0 0 2px var(--accent);
  }

  /* The preview: also a button that opens the file picker */
  .pv {
    position: relative;
    display: grid;
    place-items: center;
    width: 64px;
    height: 64px;
    padding: 0;
    border: 1px solid var(--line);
    border-radius: 14px;
    background: var(--bg);
    color: var(--text);
    font: inherit;
    overflow: hidden;
    cursor: pointer;
    transition: transform 0.15s var(--ease);
  }
  .pv.side {
    background: var(--side);
  }
  .pv:active:not(:disabled) {
    transform: scale(0.96);
  }
  .pv:disabled {
    cursor: default;
  }
  .pv-cover {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    background: rgba(0, 0, 0, 0.5);
    color: #fff;
    opacity: 0;
    transition: opacity 0.15s ease;
  }
  .pv:not(:disabled):hover .pv-cover,
  .pv:focus-visible .pv-cover,
  .over .pv-cover {
    opacity: 1;
  }
  .pv.busy .pv-cover {
    opacity: 1;
    animation: pulse 0.9s ease-in-out infinite alternate;
  }
  @keyframes pulse {
    to {
      background: rgba(0, 0, 0, 0.3);
    }
  }

  .pv img {
    display: block;
    object-fit: contain;
  }
  .p-mark {
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: var(--accent);
    color: var(--accent-text);
  }
  .p-large {
    width: 48px;
    height: 48px;
    border-radius: 12px;
  }
  .p-large-mark {
    width: 40px;
    height: 40px;
  }
  .p-large-mark .icon {
    width: 20px;
    height: 20px;
  }

  .p-small {
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    color: var(--accent);
  }
  .p-small.tiny {
    width: 22px;
    height: 22px;
  }
  .p-small img,
  .p-small .icon {
    width: 100%;
    height: 100%;
  }

  .p-app {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: 11px;
    background: #fff;
    box-shadow:
      0 0 0 1px rgba(0, 0, 0, 0.06),
      0 2px 6px rgba(0, 0, 0, 0.18);
    overflow: hidden;
  }
  .p-app img,
  .p-app .icon {
    width: 60%;
    height: 60%;
  }
  .p-app.fill img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .p-app.plain {
    background: var(--accent);
    color: #fff;
  }

  .p-tab {
    display: flex;
    align-items: center;
    gap: 5px;
    width: 50px;
    padding: 6px 7px;
    border: 1px solid var(--line);
    border-radius: 8px 8px 3px 3px;
    background: var(--side);
  }
  .p-tab img,
  .p-tab .icon {
    width: 16px;
    height: 16px;
  }
  .fav-default {
    color: #5b5bd6; /* the built-in favicon's color, whatever the accent */
  }
  .p-tab i {
    flex: 1;
    height: 4px;
    border-radius: 2px;
    background: var(--line);
  }

  .p-user {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--bubble);
    color: var(--text);
    font-size: 15px;
    font-weight: 600;
  }
  img.p-user {
    object-fit: cover;
  }

  .img-text p {
    margin: 2px 0 0;
    font-size: 13px;
    color: var(--muted);
  }
  .img-title {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 8px;
  }
  .img-title strong {
    font-size: 15px;
    font-weight: 600;
  }
  .pill {
    padding: 1px 8px;
    border-radius: 999px;
    background: var(--hover);
    color: var(--muted);
    font-size: 12px;
    white-space: nowrap;
  }
  .pill.swap {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    border: 0;
    font: inherit;
    font-size: 12px;
    cursor: pointer;
    transition:
      background 0.15s ease,
      color 0.15s ease;
  }
  .pill.swap:hover {
    background: color-mix(in srgb, var(--accent) 14%, transparent);
    color: var(--accent);
  }
  .pill.swap:active {
    transform: scale(0.96);
  }
  .pill.swap .icon {
    width: 12px;
    height: 12px;
    stroke-width: 2.2;
  }
  .pill.custom {
    background: color-mix(in srgb, var(--accent) 14%, transparent);
    color: var(--accent);
  }
  .pill.bad {
    background: color-mix(in srgb, #d93a3a 14%, transparent);
    color: #d93a3a;
  }

  .img-btns {
    display: flex;
    gap: 8px;
  }

  .img-foot {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    margin-top: 16px;
  }

  .img-foot-end {
    display: flex;
    gap: 8px;
  }
  .dl {
    display: grid;
    place-items: center;
    padding: 0 9px;
  }
  .dl .icon {
    width: 18px;
    height: 18px;
  }
  .dl.busy .icon {
    animation: nudge 0.7s ease-in-out infinite alternate;
  }
  @keyframes nudge {
    to {
      translate: 0 2px;
    }
  }

  @media (max-width: 520px) {
    .img-row {
      grid-template-columns: 64px minmax(0, 1fr);
      gap: 10px 14px;
    }
    .img-btns {
      grid-column: 2;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .pv.busy .pv-cover,
    .dl.busy .icon {
      animation: none;
    }
  }
</style>
