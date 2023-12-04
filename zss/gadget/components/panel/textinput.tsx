import { tokenizeAndWriteTextFormat } from '../../data/textFormat'

import { PanelItemProps } from './common'

export function PanelItemInputText({
  player,
  active,
  label,
  args,
  context,
}: PanelItemProps) {
  tokenizeAndWriteTextFormat(`$white${label} $greenKrupts`, context)
  return null
}
