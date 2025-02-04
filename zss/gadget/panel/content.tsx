import {
  WRITE_TEXT_CONTEXT,
  tokenizeandwritetextformat,
} from 'zss/words/textformat'

type PanelItemContentProps = {
  item: string
  player: string
  inline: boolean
  context: WRITE_TEXT_CONTEXT
}

export function PanelItemContent({
  item,
  inline,
  context,
}: PanelItemContentProps) {
  tokenizeandwritetextformat(`${item}${inline ? `` : `\n`}`, context, true)
  return null
}
