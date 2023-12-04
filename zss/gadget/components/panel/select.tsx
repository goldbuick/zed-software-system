import { tokenizeAndWriteTextFormat } from '../../data/textFormat'

import { PanelItemProps } from './common'

export function PanelItemSelect({ label, args, context }: PanelItemProps) {
  tokenizeAndWriteTextFormat(
    `$white${label} $green${(args[0] ?? '').toUpperCase()}`,
    context,
  )
  return null
}
