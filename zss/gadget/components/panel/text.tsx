import {
  WRITE_TEXT_CONTEXT,
  tokenizeAndWriteTextFormat,
} from '../../data/textFormat'

interface PanelItemTextProps {
  item: string
  player: string
  context: WRITE_TEXT_CONTEXT
}

export function PanelItemText({ item, context }: PanelItemTextProps) {
  tokenizeAndWriteTextFormat(item, context)
  return null
}
