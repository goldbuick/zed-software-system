import { useTape } from 'zss/device/tape'
import {
  tokenizeandmeasuretextformat,
  tokenizeandwritetextformat,
  useWriteText,
} from 'zss/gadget/data/textformat'

import { useBlink } from '../../useblink'
import { writeTile } from '../../usetiles'

import { BG, BKG_PTRN, FG, setupeditoritem } from './common'

export function EditorFrame() {
  const context = useWriteText()

  const topedge = 2
  const leftedge = 1
  const rightedge = context.width - 2
  const bottomedge = context.height - 2

  // fill
  for (let y = 0; y < context.height; ++y) {
    for (let x = 0; x < context.width; ++x) {
      writeTile(context, context.width, context.height, x, y, {
        char: BKG_PTRN,
        color: FG,
        bg: BG,
      })
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

  const bottomchrs = `$205`.repeat(context.width - 2)
  setupeditoritem(false, false, 0, context.height - 1, 0, context)
  tokenizeandwritetextformat(`$212${bottomchrs}$190`, context, true)

  const tape = useTape()
  const blink = useBlink()

  const egtop = `$196`.repeat(context.width - 4)
  setupeditoritem(false, false, 0, 0, 0, context)
  tokenizeandwritetextformat(`$213$205$187${egtop}$191`, context, true)

  const egbottom = `$205`.repeat(context.width - 4)
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
  const result = tokenizeandmeasuretextformat(
    title,
    context.width,
    context.height,
  )
  const titlewidth = result?.measuredwidth ?? 1
  const titlex = Math.round(context.width * 0.5) - Math.round(titlewidth * 0.5)
  setupeditoritem(false, false, titlex, 0, 0, context)
  tokenizeandwritetextformat(title, context, true)

  return null
}
