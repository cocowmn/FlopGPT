<!-- Desktop app only: the LAN server that phones connect to. Polls while the settings are open. -->
<script lang="ts">
  import { server } from '../../lib/backend';
  import { ui } from '../../lib/stores/ui.svelte';
  import type { ServerStatus } from '../../lib/types';

  let { active }: { active: boolean } = $props();

  let st = $state<ServerStatus | null>(null);
  let port = $state('');
  let portInput: HTMLInputElement;
  let qr = $state('');
  let qrFor = '';

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

  $effect(() => {
    const url = st?.lanUrls[0] || '';
    if (url === qrFor) return;
    qrFor = url;
    qr = '';
    if (url)
      server
        .qr(url)
        .then(svg => {
          if (qrFor === url) qr = svg;
        })
        .catch(() => {});
  });

  function applyPort() {
    const p = parseInt(port, 10);
    if (!(p >= 1024 && p <= 65535)) return ui.toast('Use a port from 1024 to 65535.');
    call(() => server.setPort(p));
  }

  function copy(t: string) {
    navigator.clipboard.writeText(t).then(
      () => ui.toast('Copied ' + t),
      () => ui.toast(t)
    );
  }

  const n = $derived(st?.clients.length ?? 0);
</script>

<div class="set-row srv">
  <div class="srv-main">
    <strong>Phone server</strong>
    <p>
      <span class="srv-dot" class:on={st?.running} class:err={st && !st.running && st.error}></span>
      {#if !st}Starting…
      {:else if st.running}Running on port {st.port}{st.port !== st.configuredPort ? ` (${st.configuredPort} was busy)` : ''}
      {:else}{st.error || 'Stopped'}{/if}
    </p>
    {#if st}
      <p>
        {#if st.running && !st.lanUrls.length}No wifi network found. Phones need the same network as this Mac.{/if}
        {#each st.lanUrls as u, i (u)}{#if i}&nbsp;·&nbsp;{/if}<button class="link" type="button" title="Copy" onclick={() => copy(u)}>{u}</button>{/each}
      </p>
      {#if st.running}
        <p>
          {n} device{n === 1 ? '' : 's'} connected · {st.requests} request{st.requests === 1 ? '' : 's'}{n
            ? ': ' + st.clients.map(c => c.ip).join(', ')
            : ''}
        </p>
      {/if}
    {/if}
    <label class="srv-check">
      <input type="checkbox" checked={st?.phoneEdit ?? false} onchange={e => call(() => server.setPhoneEdit(e.currentTarget.checked))} />
      Let phones change the config
    </label>
    <div class="srv-port">
      <label for="srvPort">Port</label>
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
          }
        }}
      />
      <button class="btn" type="button" onclick={applyPort}>Apply</button>
      <button class="btn" type="button" onclick={() => call(st?.running ? server.stop : server.start)}>{st?.running ? 'Stop' : 'Start'}</button>
    </div>
  </div>
  {#if qr}<div class="srv-qr" aria-label="QR code for the phone address">{@html qr}</div>{/if}
</div>

<style>
  .set-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 0;
    border-top: 1px solid var(--line);
  }
  .set-row p {
    margin: 2px 0 0;
    font-size: 13px;
    color: var(--muted);
    overflow-wrap: anywhere;
  }
  .srv {
    align-items: flex-start;
  }
  .srv-main {
    min-width: 0;
  }
  .srv-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    margin-right: 6px;
    border-radius: 50%;
    background: var(--muted);
    vertical-align: 1px;
  }
  .srv-dot.on {
    background: #2fa84f;
  }
  .srv-dot.err {
    background: #d93f3f;
  }
  .srv .link {
    font-size: 13px;
  }
  .srv-port {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
    font-size: 13px;
    color: var(--muted);
  }
  .srv-port .ed-in {
    width: 90px;
  }
  .srv-check {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 6px;
    font-size: 13px;
    color: var(--muted);
  }
  .srv-qr:empty {
    display: none;
  }
  .srv-qr :global(svg) {
    display: block;
    width: 132px;
    height: 132px;
    border-radius: 8px;
  }
  @media (max-width: 520px) {
    .srv {
      flex-direction: column;
    }
  }
</style>
