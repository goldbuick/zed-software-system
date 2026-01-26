import { useTape } from 'zss/gadget/data/state'
import { useWriteText, writeTile } from 'zss/gadget/hooks'
import { textformatreadedges } from 'zss/words/textformat'

import { BKG_PTRN, BKG_PTRN_ALT, FG, bgcolor } from './common'

type TapeBackPlateProps = {
  bump?: boolean
}

export function TapeBackPlate({ bump }: TapeBackPlateProps) {
  const context = useWriteText()
  const edge = textformatreadedges(context)
  const { quickterminal } = useTape()
  const BG = bgcolor(quickterminal)

  if (bump) {
    edge.top++
  }

  if (quickterminal) {
    for (let y = edge.top; y <= edge.bottom; ++y) {
      for (let x = edge.left; x <= edge.right; ++x) {
        writeTile(context, context.width, context.height, x, y, {
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
      writeTile(context, context.width, context.height, x, y, {
        char,
        color: FG,
        bg: BG,
      })
    }
  }
  return null
}
