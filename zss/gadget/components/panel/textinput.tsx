import {
  WRITE_TEXT_CONTEXT,
  tokenizeAndWriteTextFormat,
} from '../../data/textFormat'

interface PanelItemInputTextProps {
  player: string
  active: boolean
  target: string
  label: string
  args: string[]
  context: WRITE_TEXT_CONTEXT
}

export function PanelItemInputText({
  player,
  active,
  target,
  label,
  args,
  context,
}: PanelItemInputTextProps) {
  tokenizeAndWriteTextFormat(`$white${label} $greenKrupts`, context)
  return null
}
