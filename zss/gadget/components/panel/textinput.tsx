import {
  WRITE_TEXT_CONTEXT,
  tokenizeAndWriteTextFormat,
} from '../../data/textFormat'

interface PanelItemInputTextProps {
  target: string
  label: string
  args: string[]
  context: WRITE_TEXT_CONTEXT
}

export function PanelItemInputText({
  target,
  label,
  args,
  context,
}: PanelItemInputTextProps) {
  tokenizeAndWriteTextFormat(`$white${label} $greenKrupts`, context)
  return null
}
