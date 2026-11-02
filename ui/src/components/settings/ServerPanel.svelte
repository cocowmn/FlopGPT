<!-- Settings' Server tab (desktop app only): the LAN server that phones connect to. Polls while it's shown. -->
<script lang="ts">
  import { server } from '../../lib/backend';
  import { ui } from '../../lib/stores/ui.svelte';
  import type { ServerStatus } from '../../lib/types';

  let { active }: { active: boolean } = $props();

  let st = $state<ServerStatus | null>(null);
  let port = $state('');
  let portInput: HTMLInputElement;
  let qrs = $state<Record<string, string>>({}); // QR code SVG by URL, '' while it's made

  async function call(fn: () => Promise<ServerStatus>) {
    try {
      st = await fn();
    } catch (e) {
      ui.toast(String(e));
    }
  }

  $effect(() => {
    if (!active) return;
    call(server.status);
    const t = setInterval(() => call(server.status), 2000);
    return () => clearInterval(t);
  });

  // Follow the saved port, except while it's being edited.
  $effect(() => {
    if (st && document.activeElement !== portInput) port = String(st.configuredPort);
  });

  // With HTTPS on, a phone first opens the setup page (plain HTTP) to trust the certificate.
  const open = $derived(st?.running ? st.lanUrls[0] || '' : '');
  const setup = $derived(st?.running ? st.setupUrls[0] || '' : '');

  $effect(() => {
    for (const url of [open, setup])
      if (url && !(url in qrs)) {
        qrs[url] = '';
        server
          .qr(url)
          .then(svg => (qrs[url] = svg))
          .catch(() => {});
      }
  });

  async function resetCert() {
    const ok = await ui.confirm(
      'Make a new certificate? Phones that trust the current one will need to be set up again.',
      'Make new',
    );
    if (ok) call(server.resetCert);
  }

  function applyPort() {
    const p = parseInt(port, 10);
    if (!(p >= 1024 && p <= 65535)) return ui.toast('Use a port from 1024 to 65535.');
    call(() => server.setPort(p));
  }

  function copy(t: string) {
    navigator.clipboard.writeText(t).then(
      () => ui.toast('Copied ' + t),
      () => ui.toast(t),
    );
  }

  function seen(c: ServerStatus['clients'][number]) {
    if (c.open) return 'Viewing now';
    const s = c.lastSeenSecs;
    return s < 10 ? 'Active now' : s < 60 ? `Seen ${s}s ago` : `Seen ${Math.floor(s / 60)}m ago`;
  }

  const n = $derived(st?.clients.length ?? 0);
  const phase = $derived(!st ? 'idle' : st.running ? 'on' : st.error ? 'err' : 'off');
  const dirty = $derived(!!st && port !== String(st.configuredPort));
  const warnings = $derived(
    !st
      ? []
      : [
          !st.running && st.error,
          st.running &&
            st.port !== st.configuredPort &&
            `Port ${st.configuredPort} was busy, so it's using ${st.port} instead.`,
          st.running && !st.lanUrls.length && 'No wifi network found. Phones need the same network as this Mac.',
          st.certError,
        ].filter((w): w is string => !!w),
  );
</script>

<section class="srv-card" class:steps={!!setup}>
  {#if open && !setup}
    <div class="srv-one">{@render code(open)}</div>
  {/if}
  <div class="srv-info">
    <span class="srv-pill {phase}">
      <span class="srv-dot"></span>
      {#if phase === 'idle'}Starting…
      {:else if phase === 'on'}Live on port {st?.port}
      {:else if phase === 'err'}Couldn't start
      {:else}Stopped{/if}
    </span>
    {#each st?.running ? st.lanUrls : [] as u (u)}
      <div class="srv-url">
        <code>{u}</code>
        <button class="icon-btn" type="button" aria-label="Copy {u}" title="Copy" onclick={() => copy(u)}>
          <svg class="icon"><use href="#i-copy" /></svg>
        </button>
      </div>
    {/each}
    {#if st?.running}
      <p>
        {open && !setup ? "Scan with a phone's camera to open it. " : ''}{n
          ? `${n} phone${n === 1 ? '' : 's'} connected`
          : 'No phones connected yet'}
      </p>
    {:else if phase === 'off'}
      <p>Start the server to let phones on your wifi open the demo.</p>
    {/if}
    {#if st}
      <div class="srv-act">
        <button
          class="btn"
          class:primary={!st.running}
          class:danger={st.running}
          type="button"
          onclick={() => call(st?.running ? server.stop : server.start)}>{st.running ? 'Stop' : 'Start'}</button
        >
      </div>
    {/if}
  </div>
  {#if setup}
    <ol class="srv-steps">
      <li>
        {@render code(setup)}
        <b>Trust this computer</b>
        <span>Scan, then follow the steps on the phone.</span>
      </li>
      <li>
        {@render code(open)}
        <b>Open the app</b>
        <span>Scan, then add it to the home screen.</span>
      </li>
    </ol>
    <p class="srv-note">
      Each phone needs this once. The installed app is tied to this address, so reinstall it if the address or port
      changes.
    </p>
  {/if}
  {#each warnings as w (w)}
    <p class="srv-warn" role="status">{w}</p>
  {/each}
</section>

{#if st?.running}
  <h3 class="set-head">Devices</h3>
  {#each st.clients as c (c.ip)}
    <div class="srv-row">
      <code>{c.ip}</code>
      <span class="srv-seen" class:live={c.open}>
        {seen(c)} · {c.requests} request{c.requests === 1 ? '' : 's'}
      </span>
    </div>
  {:else}
    <p class="srv-empty">No phones yet. Scan the code above with a phone on the same wifi.</p>
  {/each}
{/if}

<h3 class="set-head">Options</h3>
<label class="srv-row">
  <span>
    Allow phones to edit
    <small>Phones can change the script, branding and settings.</small>
  </span>
  <input
    class="switch"
    type="checkbox"
    role="switch"
    checked={st?.phoneEdit ?? false}
    onchange={e => call(() => server.setPhoneEdit(e.currentTarget.checked))}
  />
</label>
<label class="srv-row">
  <span>
    HTTPS
    <small>Lets phones install the demo as an app. Each phone needs a one-time setup.</small>
  </span>
  <input
    class="switch"
    type="checkbox"
    role="switch"
    checked={st?.https ?? false}
    onchange={e => call(() => server.setHttps(e.currentTarget.checked))}
  />
</label>

<h3 class="set-head">Advanced</h3>
<div class="srv-row">
  <label for="srvPort">
    Port
    <small>From 1024 to 65535. Phones that installed the app need to reinstall it after a change.</small>
  </label>
  <div class="set-btns">
    {#if dirty}<button class="btn primary" type="button" onclick={applyPort}>Apply</button>{/if}
    <input
      class="ed-in"
      id="srvPort"
      type="number"
      min="1024"
      max="65535"
      inputmode="numeric"
      bind:this={portInput}
      bind:value={() => port, v => (port = String(v ?? ''))}
      onkeydown={e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          applyPort();
        } else if (e.key === 'Escape' && dirty) {
          e.preventDefault();
          port = String(st?.configuredPort);
        }
      }}
    />
  </div>
</div>
{#if st?.https}
  <div class="srv-row">
    <span>
      Certificate
      <small>Make a new one if phones stop trusting this computer.</small>
    </span>
    <button class="btn" type="button" onclick={resetCert}>New certificate</button>
  </div>
{/if}

{#snippet code(url: string)}
  <!-- eslint-disable-next-line svelte/no-at-html-tags -- QR code SVG generated by the app -->
  <div class="srv-qr" role="img" aria-label={'QR code for ' + url}>{@html qrs[url] ?? ''}</div>
{/snippet}

<style>
  /* The connect card: QR beside the status, or the two setup steps below it with HTTPS on */
  .srv-card {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 16px;
    margin-bottom: 4px;
    padding: 16px;
    border: 1px solid var(--line);
    border-radius: 14px;
    background: var(--side);
  }
  .srv-info:first-child,
  .srv-steps,
  .srv-note,
  .srv-warn {
    grid-column: 1 / -1;
  }
  .srv-info {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    min-width: 0;
  }
  .srv-info p,
  .srv-note,
  .srv-empty {
    margin: 0;
    font-size: 13px;
    color: var(--muted);
  }
  .srv-act {
    display: flex;
    gap: 8px;
    margin-top: auto;
    padding-top: 6px;
  }
  .steps .srv-info {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    column-gap: 12px;
  }
  .steps .srv-act {
    margin: 0 0 0 auto;
    padding: 0;
  }

  .srv-pill {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 4px 10px 4px 8px;
    border-radius: 999px;
    background: var(--hover);
    font-size: 14px;
    font-weight: 600;
  }
  .srv-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--muted);
  }
  .srv-pill.on {
    background: color-mix(in srgb, var(--ok) 14%, transparent);
  }
  .on .srv-dot {
    background: var(--ok);
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--ok) 60%, transparent);
    animation: srv-pulse 2s var(--ease) infinite;
  }
  .srv-pill.err {
    background: color-mix(in srgb, var(--danger) 12%, transparent);
  }
  .err .srv-dot {
    background: var(--danger);
  }
  @keyframes srv-pulse {
    70% {
      box-shadow: 0 0 0 6px transparent;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .on .srv-dot {
      animation: none;
    }
  }

  .srv-url {
    display: flex;
    align-items: center;
    gap: 2px;
    max-width: 100%;
  }
  code {
    font-size: 13px;
    overflow-wrap: anywhere;
  }
  .srv-url .icon-btn {
    flex: none;
    width: 28px;
    height: 28px;
  }
  .srv-url .icon {
    width: 15px;
    height: 15px;
  }

  .srv-qr {
    width: 132px;
    height: 132px;
    border-radius: 10px;
    overflow: hidden;
    background: var(--hover);
  }
  .srv-qr :global(svg) {
    display: block;
    width: 100%;
    height: 100%;
  }

  .srv-steps {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin: 0;
    padding: 0;
    list-style: none;
    counter-reset: step;
  }
  .srv-steps li {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 14px 12px;
    border: 1px solid var(--line);
    border-radius: 12px;
    background: var(--bg);
    text-align: center;
    counter-increment: step;
  }
  .srv-steps .srv-qr {
    margin-bottom: 6px;
  }
  .srv-steps b {
    font-size: 14px;
  }
  .srv-steps b::before {
    content: counter(step) '. ';
    color: var(--accent);
  }
  .srv-steps span {
    font-size: 12px;
    color: var(--muted);
  }

  .srv-warn {
    margin: 0;
    padding: 8px 12px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--warn) 14%, transparent);
    font-size: 13px;
  }

  .set-head {
    margin: 0;
    padding: 16px 0 6px;
    font-size: 15px;
  }
  .srv-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 0;
    border-top: 1px solid var(--line);
    font-size: 14px;
  }
  .set-head + .srv-row {
    border-top: 0;
  }
  label.srv-row {
    cursor: pointer;
  }
  .srv-row small {
    display: block;
    margin-top: 2px;
    font-size: 13px;
    color: var(--muted);
  }
  .srv-seen {
    font-size: 13px;
    color: var(--muted);
  }
  .srv-seen.live {
    color: var(--ok);
  }
  .srv-row .ed-in {
    width: 90px;
  }
  .btn.danger {
    color: var(--danger);
  }

  @media (max-width: 520px) {
    .srv-card {
      grid-template-columns: 1fr;
    }
    .srv-one {
      justify-self: center;
    }
    .srv-steps {
      grid-template-columns: 1fr;
    }
  }
</style>
