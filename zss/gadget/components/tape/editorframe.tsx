import { useTape } from 'zss/device/tape'
import {
  tokenizeandmeasuretextformat,
  tokenizeandwritetextformat,
  useWriteText,
} from 'zss/gadget/data/textformat'

import { useBlink } from '../useblink'
import { writeTile } from '../usetiles'

import { BG, FG, setupeditoritem } from './common'

export function EditorFrame() {
  const context = useWriteText()

  // left - right - bottom of frame
  for (let y = 1; y < context.height - 1; ++y) {
    writeTile(context, context.width, context.height, 0, y, {
      char: 179,
      color: FG,
      bg: BG,
    })
    writeTile(context, context.width, context.height, context.width - 1, y, {
      char: 179,
      color: FG,
      bg: BG,
    })
  }

  const bottomedge = `$205`.repeat(context.width - 2)
  setupeditoritem(false, false, 0, context.height - 1, 0, context)
  tokenizeandwritetextformat(`$212${bottomedge}$190`, context, true)

  const tape = useTape()
  const blink = useBlink()

  setupeditoritem(false, false, 0, 0, 0, context)
  const egtop = `$196`.repeat(context.width - 4)
  const egbottom = `$205`.repeat(context.width - 4)
  tokenizeandwritetextformat(`$213$205$187${egtop}$191`, context, true)
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
