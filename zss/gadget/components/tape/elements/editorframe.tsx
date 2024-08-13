import { useTape } from 'zss/device/tape'
import {
  textformatreadedges,
  tokenizeandmeasuretextformat,
  tokenizeandwritetextformat,
  useWriteText,
} from 'zss/gadget/data/textformat'

import { useBlink } from '../../useblink'
import { writeTile } from '../../usetiles'
import { BG, BKG_PTRN, FG, setupeditoritem } from '../common'

export function EditorFrame() {
  const context = useWriteText()
  const edge = textformatreadedges(context)
  const topedge = edge.top + 2
  const leftedge = edge.left + 1
  const rightedge = edge.right - 2
  const bottomedge = edge.bottom - 2

  // fill
  for (let y = 0; y < edge.height; ++y) {
    for (let x = 0; x < edge.width; ++x) {
      writeTile(
        context,
        context.width,
        context.height,
        edge.left + x,
        edge.top + y,
        {
          char: BKG_PTRN,
          color: FG,
          bg: BG,
        },
      )
    }
  }

  // left - right - bottom of frame
  for (let y = topedge - 1; y <= bottomedge + 1; ++y) {
    writeTile(context, context.width, context.height, leftedge - 1, y, {
      char: 179,
      color: FG,
      bg: BG,
    })
    writeTile(context, context.width, context.height, rightedge + 1, y, {
      char: 179,
      color: FG,
      bg: BG,
    })
  }

  const egtop = `$196`.repeat(edge.width - 4)
  setupeditoritem(false, false, 0, 0, 0, context)
  tokenizeandwritetextformat(`$213$205$187${egtop}$191`, context, true)

  const bottomchrs = `$205`.repeat(edge.width - 2)
  setupeditoritem(false, false, 0, edge.height - 1, 0, context)
  tokenizeandwritetextformat(`$212${bottomchrs}$190`, context, true)

  const tape = useTape()
  const blink = useBlink()

  const egbottom = `$205`.repeat(edge.width - 4)
  setupeditoritem(false, false, 0, 1, 0, context)
  tokenizeandwritetextformat(
    `$179$${blink ? '7' : '232'}$200${egbottom}$181`,
    context,
    true,
  )

  // make label
  const label = tape.editor.type === 'object' ? '' : `[${tape.editor.type}] `

  // write name
  const title = ` ${label}${tape.editor.title} `
  const result = tokenizeandmeasuretextformat(title, edge.width, edge.height)
  const titlewidth = result?.measuredwidth ?? 1
  const titlex = Math.round(edge.width * 0.5) - Math.round(titlewidth * 0.5)
  setupeditoritem(false, false, titlex, 0, 0, context)
  tokenizeandwritetextformat(title, context, true)

  return null
}
