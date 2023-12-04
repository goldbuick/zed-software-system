import { tokenizeAndWriteTextFormat } from '../../data/textFormat'

import { PanelItemProps } from './common'

export function PanelItemRange({ label, args, context }: PanelItemProps) {
  const [maybeMinLabel, maybeMaxLabel] = args
  const minLabel = maybeMinLabel || '1'
  const maxLabel = maybeMaxLabel || '9'
  tokenizeAndWriteTextFormat(
    `$white${label} $white${minLabel} $white..$green+$white.:.... ${maxLabel}`,
    context,
  )
  return null
}
