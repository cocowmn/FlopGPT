import { toEditData, type EditData } from '../../lib/normalize';
import { store } from '../../lib/stores/config.svelte';
import { ui } from '../../lib/stores/ui.svelte';

/** What the open editor holds: the form's working copy, and whether anything changed. */
export const ed = $state<{ data: EditData | null; dirty: boolean }>({ data: null, dirty: false });

export function openEditor() {
  ed.data = toEditData(store.config);
  ed.dirty = false;
  ui.editorOpen = true;
}

export const changed = () => (ed.dirty = true);
