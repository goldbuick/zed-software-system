import { clamp } from 'zss/mapping/number'
import { ispresent } from 'zss/mapping/types'
import {
  WRITE_TEXT_CONTEXT,
  hascenter,
  textformatreadedges,
  tokenizeandmeasuretextformat,
  tokenizeandwritetextformat,
} from 'zss/words/textformat'

import { setuppanelitem } from './common'

type PanelItemContentProps = {
  sidebar: boolean
  item: string
  player: string
  row?: number
  context: WRITE_TEXT_CONTEXT
}

export function PanelContent({
  sidebar,
  item,
  row,
  context,
}: PanelItemContentProps) {
  setuppanelitem(sidebar, row, context)
  const edge = textformatreadedges(context)

  // detect $CENTER
  const centertext = hascenter(item)
  if (ispresent(centertext)) {
    const widthmax = edge.width - 3
    const measure = tokenizeandmeasuretextformat(centertext, widthmax, 3)
    const contentmax = measure?.measuredwidth ?? 1
    const padding = clamp(
      Math.floor(widthmax * 0.5 - contentmax * 0.5),
      0,
      widthmax,
    )
    tokenizeandwritetextformat(
      `${' '.repeat(padding)}$WHITE${centertext}${ispresent(row) ? `\n` : ``}`,
      context,
      true,
    )
  } else {
    tokenizeandwritetextformat(
      `${item}${ispresent(row) ? `\n` : ``}`,
      context,
      true,
    )
  }

  return null
}
