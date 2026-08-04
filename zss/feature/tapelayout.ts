import { durableget, durableset } from 'zss/feature/durable'
import {
  TAPE_DISPLAY,
  type TAPE_LAYOUTBY,
  useTape,
} from 'zss/gadget/data/zustandstores'

export const TAPE_LAYOUTBY_KEY = 'tapelayoutby'

export type TAPE_LAYOUT_MODALITY = 'quick' | 'cli' | 'editor'

export function defaulttapelayoutby(): TAPE_LAYOUTBY {
  return {
    quick: TAPE_DISPLAY.TOP,
    cli: TAPE_DISPLAY.TOP,
    editor: TAPE_DISPLAY.TOP,
  }
}

function isvalidtapdisplay(value: unknown): value is TAPE_DISPLAY {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= (TAPE_DISPLAY.TOP as number) &&
    value < (TAPE_DISPLAY.MAX as number)
  )
}

export function validatetapelayoutby(raw: unknown): TAPE_LAYOUTBY {
  const defaults = defaulttapelayoutby()
  if (!raw || typeof raw !== 'object') {
    return defaults
  }
  const record = raw as Record<string, unknown>
  return {
    quick: isvalidtapdisplay(record.quick) ? record.quick : defaults.quick,
    cli: isvalidtapdisplay(record.cli) ? record.cli : defaults.cli,
    editor: isvalidtapdisplay(record.editor) ? record.editor : defaults.editor,
  }
}

export function readtapelayoutmodality(): TAPE_LAYOUT_MODALITY {
  const { editor, terminalmode } = useTape.getState()
  if (editor.open) {
    return 'editor'
  }
  if (terminalmode === 'quick') {
    return 'quick'
  }
  return 'cli'
}

/** Terminal underlay slot — never the editor modality (dual PanelSlide). */
export function tapelayoutslotforterminal(
  layoutby: TAPE_LAYOUTBY,
  terminalmode: 'cli' | 'quick',
): TAPE_DISPLAY {
  return layoutby[terminalmode === 'quick' ? 'quick' : 'cli']
}

/** Editor overlay slot from layoutby. */
export function tapelayoutslotforeditor(layoutby: TAPE_LAYOUTBY): TAPE_DISPLAY {
  return layoutby.editor
}

/** Sync active `layout` from `layoutby` for the current modality. */
export function synctapeactivelayout(): void {
  const { layoutby } = useTape.getState()
  const modality = readtapelayoutmodality()
  useTape.setState({ layout: layoutby[modality] })
}

export async function persisttapelayoutby(
  layoutby: TAPE_LAYOUTBY,
): Promise<void> {
  await durableset(TAPE_LAYOUTBY_KEY, layoutby)
}

/** Load durable slots into zustand and sync the active layout. */
export async function hydratetapelayoutby(): Promise<void> {
  const stored = await durableget<unknown>(TAPE_LAYOUTBY_KEY)
  const layoutby = validatetapelayoutby(stored)
  const modality = readtapelayoutmodality()
  useTape.setState({
    layoutby,
    layout: layoutby[modality],
  })
}

/** Write one modality slot, sync active layout if needed, persist. */
export function writetapelayoutslot(
  modality: TAPE_LAYOUT_MODALITY,
  next: TAPE_DISPLAY,
): void {
  const { layoutby } = useTape.getState()
  const updated: TAPE_LAYOUTBY = {
    ...layoutby,
    [modality]: next,
  }
  const active = readtapelayoutmodality()
  useTape.setState({
    layoutby: updated,
    ...(active === modality ? { layout: next } : {}),
  })
  void persisttapelayoutby(updated).catch(() => {})
}
