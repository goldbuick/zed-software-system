import {
  WRITE_TEXT_CONTEXT,
  tokenizeAndWriteTextFormat,
  writeTextColorReset,
} from '../../data/textFormat'

interface PanelItemTextProps {
  item: string
  playerId: string
  context: WRITE_TEXT_CONTEXT
}

export function PanelItemText({ item, playerId, context }: PanelItemTextProps) {
  if (tokenizeAndWriteTextFormat(item, context)) {
    writeTextColorReset(context)
  }

  return null
}