import {
  textformatreadedges,
  WRITE_TEXT_CONTEXT,
} from 'zss/gadget/data/textformat'

import { writeTile } from '../../usetiles'
import { BG, BKG_PTRN, BKG_PTRN_ALT, FG } from '../common'

type BackPlateProps = {
  context: WRITE_TEXT_CONTEXT
}

export function BackPlate({ context }: BackPlateProps) {
  const edge = textformatreadedges(context)

  for (let y = edge.top; y <= edge.bottom; ++y) {
    for (let x = edge.left; x <= edge.right; ++x) {
      let char = 0
      if ((x + y) % 2 === 0) {
        char = Math.abs(Math.round(Math.cos(x * y * 0.01)))
          ? BKG_PTRN
          : BKG_PTRN_ALT
      }
      writeTile(context, context.width, context.height, x, y, {
        char,
        color: FG,
        bg: BG,
      })
    }
  }

  return null
}
