<!-- Settings' About tab: what FlopGPT is, and where to find the code and the guides. -->
<script lang="ts">
  import { VERSION } from '../../lib/backend';

  const REPO = 'https://github.com/cocowmn/FlopGPT';
  const links = [
    { href: REPO, title: 'Source code', text: 'The FlopGPT repository on GitHub' },
    { href: `${REPO}/blob/main/docs/README.md`, title: 'User guides', text: 'Write a script, rebrand it, perform it' },
    { href: `${REPO}/releases/latest`, title: 'Downloads', text: 'The latest desktop app for Mac, Windows and Linux' },
  ];
</script>

<div class="about">
  <span class="mark"><svg class="icon"><use href="#i-logo" /></svg></span>
  <div>
    <h3>FlopGPT <span class="ver">v{VERSION}</span></h3>
    <p>
      A parody AI chat app that plays back a script. Every "answer" is one you wrote, with as much fake thinking as the
      joke needs. Made for skits, videos, classrooms and demos.
    </p>
  </div>
</div>

<ul class="links">
  {#each links as l (l.href)}
    <li>
      <a href={l.href} target="_blank" rel="noopener noreferrer">
        <span>
          <strong>{l.title}</strong>
          <small>{l.text}</small>
        </span>
        <svg class="icon" aria-hidden="true"><use href="#i-external" /></svg>
      </a>
    </li>
  {/each}
</ul>

<style>
  .about {
    display: flex;
    gap: 14px;
    align-items: flex-start;
    padding-bottom: 16px;
  }
  .mark {
    display: grid;
    flex: none;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: var(--accent);
    color: var(--accent-text);
  }
  .mark .icon {
    width: 22px;
    height: 22px;
  }
  h3 {
    margin: 2px 0 4px;
    font-size: 17px;
  }
  .ver {
    color: var(--muted);
    font-size: 13px;
    font-weight: 400;
  }
  p {
    margin: 0;
    font-size: 14px;
    color: var(--muted);
  }

  .links {
    margin: 0 -20px;
    padding: 0;
    list-style: none;
    border-top: 1px solid var(--line);
  }
  .links a {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 20px;
    border-bottom: 1px solid var(--line);
    color: inherit;
    text-decoration: none;
    transition: background 0.15s ease;
  }
  .links a:hover,
  .links a:focus-visible {
    background: var(--hover);
    outline: 0;
  }
  .links span {
    display: flex;
    flex-direction: column;
  }
  .links small {
    margin-top: 2px;
    font-size: 13px;
    color: var(--muted);
  }
  .links .icon {
    flex: none;
    width: 16px;
    height: 16px;
    color: var(--muted);
  }
</style>
