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
  const edge = textformatreadedges(context)

  // detect $CENTER
  const centertext = hascenter(item)
  if (ispresent(centertext)) {
    const measure = tokenizeandmeasuretextformat(
      centertext,
      edge.width,
      edge.height,
    )
    const contentmax = measure?.measuredwidth ?? 1
    const padding = clamp(
      Math.round((edge.width - contentmax - 3) * 0.5),
      0,
      edge.width,
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
