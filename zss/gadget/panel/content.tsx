import { ispresent } from 'zss/mapping/types'
import {
  WRITE_TEXT_CONTEXT,
  tokenizeandwritetextformat,
} from 'zss/words/textformat'

import { setuppanelitem } from './common'

type PanelItemContentProps = {
  item: string
  player: string
  row?: number
  context: WRITE_TEXT_CONTEXT
}

export function PanelItemContent({
  item,
  row,
  context,
}: PanelItemContentProps) {
  setuppanelitem(row, context)

  tokenizeandwritetextformat(
    `${item}${ispresent(row) ? `\n` : ``}`,
    context,
    true,
  )
  return null
}
