import { useTape } from 'zss/gadget/data/state'
import { writetile } from 'zss/gadget/tiles'
import { useWriteText } from 'zss/gadget/writetext'
import { textformatreadedges } from 'zss/words/textformat'

import { FG, bgcolorformode } from './colors'
import { BKG_PTRN, BKG_PTRN_ALT } from './common'

type TapeBackPlateProps = {
  bump?: boolean
}

export function TapeBackPlate({ bump }: TapeBackPlateProps) {
  const context = useWriteText()
  const edge = textformatreadedges(context)
  const terminalmode = useTape((state) => state.terminalmode)
  const BG = bgcolorformode(terminalmode)

  if (bump) {
    edge.top++
  }

  if (terminalmode === 'quick') {
    for (let y = edge.top; y <= edge.bottom; ++y) {
      for (let x = edge.left; x <= edge.right; ++x) {
        writetile(context, context.width, context.height, x, y, {
          char: 0,
          color: FG,
          bg: BG,
        })
      }
    }
    return null
  }

  for (let y = edge.top; y <= edge.bottom; ++y) {
    for (let x = edge.left; x <= edge.right; ++x) {
      let char = 0
      if ((x + y) % 2 === 0) {
        char = Math.abs(Math.round(Math.cos(x * y * 0.01)))
          ? BKG_PTRN
          : BKG_PTRN_ALT
      }
      writetile(context, context.width, context.height, x, y, {
        char,
        color: FG,
        bg: BG,
      })
    }
  }
  return null
}
