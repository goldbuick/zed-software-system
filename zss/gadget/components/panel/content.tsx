import {
  WRITE_TEXT_CONTEXT,
  tokenizeAndWriteTextFormat,
} from '../../data/textformat'

type PanelItemContentProps = {
  item: string
  player: string
  context: WRITE_TEXT_CONTEXT
}

export function PanelItemContent({ item, context }: PanelItemContentProps) {
  tokenizeAndWriteTextFormat(item, context)
  return null
}
