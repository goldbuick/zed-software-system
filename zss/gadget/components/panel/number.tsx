import {
  WRITE_TEXT_CONTEXT,
  tokenizeAndWriteTextFormat,
} from '../../data/textFormat'

interface PanelItemNumberProps {
  target: string
  label: string
  args: string[]
  context: WRITE_TEXT_CONTEXT
}

export function PanelItemNumber({
  target,
  label,
  args,
  context,
}: PanelItemNumberProps) {
  tokenizeAndWriteTextFormat(`$white${label} $green37`, context)
  return null
}
