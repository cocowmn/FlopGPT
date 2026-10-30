import { toEditData, type EditData, type Section } from '../../lib/normalize';
import { store } from '../../lib/stores/config.svelte';
import { ui } from '../../lib/stores/ui.svelte';

/** What the open editor holds: which part of the config, the form's working copy, and whether anything changed. */
export const ed = $state<{ section: Section; data: EditData | null; dirty: boolean }>({
  section: 'conversation',
  data: null,
  dirty: false,
});

export function openEditor(section: Section) {
  ed.section = section;
  ed.data = toEditData(store.config);
  ed.dirty = false;
  ui.editorOpen = true;
}

export const changed = () => (ed.dirty = true);
