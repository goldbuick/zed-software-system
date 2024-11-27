import {
  WRITE_TEXT_CONTEXT,
  tokenizeandwritetextformat,
} from 'zss/words/textformat'

type PanelItemContentProps = {
  item: string
  player: string
  context: WRITE_TEXT_CONTEXT
}

export function PanelItemContent({ item, context }: PanelItemContentProps) {
  tokenizeandwritetextformat(`${item}\n`, context, true)
  return null
}
