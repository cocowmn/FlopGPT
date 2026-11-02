<!-- An image for obj[key]: upload or drop one (stored in the config), or type its address. -->
<script lang="ts">
  import { untrack } from 'svelte';
  import { toImageDataURL } from '../../lib/files';
  import { setKey } from '../../lib/normalize';
  import { ui } from '../../lib/stores/ui.svelte';
  import { changed } from './editor.svelte';

  let { obj, key, max = 1024 }: { obj: Record<string, unknown>; key: string; max?: number } = $props();

  let src = $state(untrack(() => String(obj[key] ?? '')));
  let over = $state(false);
  let picker: HTMLInputElement;
  const uploaded = $derived(src.startsWith('data:'));

  function set(v: string) {
    src = v;
    setKey(obj, key, v.trim());
    changed();
  }
  async function use(file: File | undefined) {
    if (!file) return;
    try {
      // Kept as WebP so a few images don't outgrow what a browser or phone will save.
      set(await toImageDataURL(file, max, 'image/webp', 0.85));
    } catch (e) {
      ui.toast((e as Error).message);
    }
  }
  function ondrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation(); // not a chat attachment
    over = false;
    use([...(e.dataTransfer?.files ?? [])].find(f => f.type.startsWith('image/')));
  }
</script>

<div
  class="img-in"
  class:over
  role="group"
  aria-label="Image"
  ondragover={e => {
    e.preventDefault();
    over = true;
  }}
  ondragleave={() => (over = false)}
  {ondrop}
>
  <span class="thumb">
    {#if src}<img {src} alt="" />{:else}<svg class="icon"><use href="#i-upload" /></svg>{/if}
  </span>
  {#if uploaded}
    <input class="ed-in" value="Uploaded image" disabled />
  {:else}
    <input
      class="ed-in"
      placeholder="Upload or drop one, or paste its address"
      value={src}
      oninput={e => set(e.currentTarget.value)}
    />
  {/if}
  <button class="btn" type="button" onclick={() => picker.click()}>Upload…</button>
  {#if src}
    <button class="btn" type="button" onclick={() => set('')}>Remove</button>
  {/if}
  <input
    bind:this={picker}
    type="file"
    accept="image/*"
    hidden
    onchange={() => {
      use(picker.files?.[0]);
      picker.value = '';
    }}
  />
</div>

<style>
  .img-in {
    display: flex;
    align-items: center;
    gap: 6px;
    border-radius: 10px;
    transition: box-shadow 0.15s ease;
  }
  .img-in.over {
    box-shadow: 0 0 0 2px var(--accent);
  }
  .thumb {
    display: grid;
    flex: none;
    place-items: center;
    width: 36px;
    height: 36px;
    border: 1px solid var(--line);
    border-radius: 8px;
    color: var(--muted);
    overflow: hidden;
  }
  .thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .thumb .icon {
    width: 16px;
    height: 16px;
  }
  .img-in .ed-in {
    flex: 1;
    min-width: 0;
  }
  .img-in .btn {
    flex: none;
  }
</style>
