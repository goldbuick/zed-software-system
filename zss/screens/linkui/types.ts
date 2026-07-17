import type { WRITE_TEXT_CONTEXT } from 'zss/words/textformat'

export type LinkLayout = 'terminal' | 'panel'

export type LinkSurface = {
  layout: LinkLayout
  active: boolean
  label: string
  /** Argument vector as prepared by TerminalItem / PanelItem for the widget type */
  words: string[]
  chip: string
  /** Tape modem key `chip:target`, or '' */
  modemprefix: string
  /** Draw Y (viewport placement) */
  row: number
  /** Content index for even/odd striping (may differ from row when scrolled) */
  striperow: number
  sidebar: boolean
  context: WRITE_TEXT_CONTEXT
  sendmessage: (chip: string, target: string, data: unknown[]) => void
  sendclose: () => void
}

export type LinkWidgetProps = {
  surface: LinkSurface
}
