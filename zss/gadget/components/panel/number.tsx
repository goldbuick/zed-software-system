import {
  WRITE_TEXT_CONTEXT,
  tokenizeAndWriteTextFormat,
} from '../../data/textFormat'

interface PanelItemNumberProps {
  player: string
  active: boolean
  target: string
  label: string
  args: string[]
  context: WRITE_TEXT_CONTEXT
}

export function PanelItemNumber({
  player,
  target,
  label,
  args,
  context,
}: PanelItemNumberProps) {
  tokenizeAndWriteTextFormat(`$white${label} $green37`, context)
  return null
}
