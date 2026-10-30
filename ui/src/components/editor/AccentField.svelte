<!-- The accent color: a text field (any CSS color) plus a swatch picker for hex colors. -->
<script lang="ts">
  let { value, set, disabled = false }: { value: string; set: (v: string) => void; disabled?: boolean } = $props();

  let swatch = $state('#5b5bd6');
  $effect(() => {
    if (/^#[0-9a-f]{6}$/i.test(value)) swatch = value;
  });
</script>

<span class="ed-color">
  <input
    type="color"
    class="ed-swatch"
    aria-label="Pick accent color"
    value={swatch}
    {disabled}
    oninput={e => set(e.currentTarget.value)}
  />
  <input class="ed-in" placeholder="#5b5bd6" {value} {disabled} oninput={e => set(e.currentTarget.value)} />
</span>

<style>
  .ed-color {
    display: flex;
    gap: 6px;
  }
  .ed-swatch {
    flex: none;
    width: 36px;
    height: 34px;
    padding: 2px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--bg);
    cursor: pointer;
  }
  .ed-swatch:disabled {
    cursor: default;
  }
</style>
