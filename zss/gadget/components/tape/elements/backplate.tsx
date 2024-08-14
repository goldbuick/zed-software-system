import { useWriteText } from 'zss/gadget/data/textformat'

import { writeTile } from '../../usetiles'
import { BG, BKG_PTRN, BKG_PTRN_ALT, FG } from '../common'

type BackPlateProps = {
  top: number
  left: number
  right: number
  bottom: number
}

export function BackPlate({ top, left, right, bottom }: BackPlateProps) {
  const context = useWriteText()

  for (let y = top; y <= bottom; ++y) {
    for (let x = left; x <= right; ++x) {
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
