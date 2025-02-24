import { textformatreadedges, WRITE_TEXT_CONTEXT } from 'zss/words/textformat'
import { COLOR } from 'zss/words/types'
import { useShallow } from 'zustand/react/shallow'

import { useTape } from '../data/state'
import { writeTile } from '../hooks'

import { BG, BKG_PTRN, BKG_PTRN_ALT, FG } from './common'

type BackPlateProps = {
  context: WRITE_TEXT_CONTEXT
}

export function BackPlate({ context }: BackPlateProps) {
  const edge = textformatreadedges(context)
  const [quickterminal] = useTape(
    useShallow((state) => [
      state.layout,
      state.quickterminal,
      state.editor.open,
    ]),
  )

  if (quickterminal) {
    for (let y = edge.top; y <= edge.bottom; ++y) {
      for (let x = edge.left; x <= edge.right; ++x) {
        writeTile(context, context.width, context.height, x, y, {
          char: 0,
          color: FG,
          bg: COLOR.ONCLEAR,
        })
      }
    }
  } else {
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
  }

  return null
}
