import { tokenizeAndWriteTextFormat } from '../../data/textFormat'

import { PanelItemProps } from './common'

export function PanelItemNumber({
  player,
  label,
  args,
  context,
}: PanelItemProps) {
  tokenizeAndWriteTextFormat(`$white${label} $green37`, context)
  return null
}
