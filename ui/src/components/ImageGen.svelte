<!-- A "generated" image: a placeholder while it generates (drifting colors, or rough drafts that sharpen), then the image. -->
<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import { draftFrames } from '../lib/progressive';
  import type { GenImage } from '../lib/stores/chat.svelte';
  import { ui } from '../lib/stores/ui.svelte';

  let { image, instant = false }: { image: GenImage; instant?: boolean } = $props();

  const ready = untrack(() => image.done); // already generated when it was put on screen: no animation
  let settled = $state(ready); // the image has finished fading in, so the placeholder can go
  let broken = $state(false);
  let drafts = $state<string[]>([]);
  let step = $state(0); // the draft on screen
  // Drifting colors: the animated style, or progressive when the drafts can't be drawn.
  const progressive = untrack(() => image.style) === 'progressive';
  let drift = $state(!progressive);
  let timer = 0;

  // Rough drafts, shown one after another over the generation time, the first one as soon as it's drawn.
  if (!ready && progressive) {
    const t0 = performance.now();
    draftFrames(untrack(() => image.src))
      .then(urls => {
        drafts = urls;
        const tick = () => {
          const t = (performance.now() - t0) / 1000 / Math.max(0.1, image.seconds);
          step = Math.min(urls.length - 1, Math.floor(t * urls.length));
          if (!image.done) timer = window.setTimeout(tick, 100);
        };
        tick();
      })
      .catch(() => (drift = true)); // can't be drawn (another site's image): the colors drift instead
  }
  onDestroy(() => {
    clearTimeout(timer);
    drafts.forEach(u => URL.revokeObjectURL(u));
  });

  const ratio = $derived(image.w && image.h ? `${image.w} / ${image.h}` : image.done ? 'auto' : '1');
  // Tall images are kept short enough to see at once.
  const width = $derived(
    image.w && image.h ? `min(100%, 420px, ${Math.round((460 * image.w) / image.h)}px)` : 'min(100%, 420px)',
  );
</script>

<!-- Like a thinking step: a shimmering line above the image, which folds away once it's done. -->
{#if !ready}
  <div class="label-wrap" class:gone={image.done} aria-live="polite">
    <div class="label-in"><p class="label">{image.label}</p></div>
  </div>
{/if}
<figure class="gen" class:ready class:instant class:done={image.done} style:aspect-ratio={ratio} style:width>
  {#if !settled}
    <div class="pending" aria-hidden="true">
      {#if drift}<span class="blob a"></span><span class="blob b"></span><span class="blob c"></span>{/if}
      {#each drafts as d, i (d)}
        <img class="draft" class:on={i <= step} style:--blur="{(drafts.length - i) * 2.5}px" src={d} alt="" />
      {/each}
      <span class="grain"></span>
    </div>
  {/if}
  {#if image.done && broken}
    <figcaption class="broken">Couldn't load the image</figcaption>
  {:else if image.done}
    <button
      class="zoom"
      type="button"
      aria-label="View image"
      onclick={() => (ui.lightbox = { src: image.src, alt: image.alt })}
    >
      <img
        class="final"
        class:soft={image.style === 'progressive'}
        src={image.src}
        alt={image.alt}
        style:aspect-ratio={ratio}
        onanimationend={() => (settled = true)}
        onerror={() => ((broken = true), (settled = true))}
      />
    </button>
  {/if}
</figure>

<style>
  .gen {
    position: relative;
    max-width: 100%;
    margin: 4px 0 12px;
    border-radius: 18px;
    background: color-mix(in srgb, var(--accent) 8%, var(--bubble));
    overflow: hidden;
    /* Safari doesn't round overflow: hidden over blurred or moving layers, so clip the corners outright. */
    clip-path: inset(0 round 18px);
    animation: rise 0.4s var(--ease) both;
  }
  .gen.instant,
  .gen.ready {
    animation: none;
  }

  /* While it generates: soft colors drifting under a film of grain. */
  .pending {
    position: absolute;
    inset: 0;
  }
  .blob {
    position: absolute;
    width: 75%;
    aspect-ratio: 1;
    border-radius: 50%;
    filter: blur(40px);
    opacity: 0.55;
  }
  .blob.a {
    top: -20%;
    left: -15%;
    background: var(--accent);
    animation: drift-a 9s ease-in-out infinite alternate;
  }
  .blob.b {
    right: -25%;
    bottom: -25%;
    background: color-mix(in srgb, var(--accent) 45%, #ff8fb1);
    animation: drift-b 11s ease-in-out infinite alternate;
  }
  .blob.c {
    top: 30%;
    left: 20%;
    width: 50%;
    background: color-mix(in srgb, var(--accent) 35%, #7fd4ff);
    animation: drift-c 7s ease-in-out infinite alternate;
  }
  .grain {
    position: absolute;
    inset: 0;
    background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    opacity: 0.22;
    mix-blend-mode: overlay;
    animation: breathe 2.4s ease-in-out infinite alternate;
  }
  @keyframes drift-a {
    to {
      transform: translate(35%, 25%) scale(1.15);
    }
  }
  @keyframes drift-b {
    to {
      transform: translate(-30%, -35%) scale(0.9);
    }
  }
  @keyframes drift-c {
    to {
      transform: translate(-25%, 15%) scale(1.3);
    }
  }
  @keyframes breathe {
    to {
      opacity: 0.1;
    }
  }

  /* Progressive: each draft fades in over the last, a little sharper. */
  .draft {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0;
    filter: blur(var(--blur));
    transform: scale(1.06); /* keeps the blurred edges out of sight */
    transition: opacity 0.8s ease;
  }
  .draft.on {
    opacity: 1;
  }

  .label-wrap {
    display: grid;
    grid-template-rows: 1fr;
    transition:
      grid-template-rows 0.4s var(--ease),
      opacity 0.3s ease;
  }
  .label-wrap.gone {
    grid-template-rows: 0fr;
    opacity: 0;
  }
  .label-in {
    min-height: 0;
    overflow: hidden;
  }
  .label {
    margin: 0;
    padding: 4px 0 8px;
    line-height: 1.6;
    width: fit-content;
    color: transparent;
    background: linear-gradient(90deg, var(--muted) 0%, var(--text) 50%, var(--muted) 100%) 0 0 / 200% 100%;
    -webkit-background-clip: text;
    background-clip: text;
    font-size: 0.95em;
    animation: shimmer 1.8s linear infinite;
  }
  .broken {
    display: grid;
    place-items: center;
    min-height: 160px;
    padding: 16px;
    color: var(--muted);
    font-size: 14px;
  }

  .zoom {
    position: relative;
    z-index: 1;
    display: block;
    width: 100%;
    padding: 0;
    border: 0;
    background: none;
    cursor: zoom-in;
  }
  .final {
    display: block;
    width: 100%;
    height: auto;
    object-fit: cover;
    animation: develop 1.1s var(--ease) both;
  }
  .final.soft {
    animation-name: sharpen;
    animation-duration: 0.7s;
  }
  .ready .final {
    animation: none;
  }
  @keyframes develop {
    from {
      opacity: 0;
      filter: blur(24px) saturate(0.6);
      transform: scale(1.04);
    }
  }
  @keyframes sharpen {
    from {
      opacity: 0.6;
      filter: blur(4px);
    }
  }
</style>
