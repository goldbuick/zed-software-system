import { useTape } from 'zss/device/tape'
import {
  textformatreadedges,
  tokenizeandmeasuretextformat,
  tokenizeandwritetextformat,
  useWriteText,
} from 'zss/gadget/data/textformat'

import { useBlink } from '../../useblink'
import { writeTile } from '../../usetiles'
import { BG, FG, setupeditoritem } from '../common'

export function EditorFrame() {
  const context = useWriteText()
  const edge = textformatreadedges(context)

  // left - right - bottom of frame
  for (let y = edge.top; y < edge.bottom; ++y) {
    writeTile(context, context.width, context.height, edge.left, y, {
      char: 179,
      color: FG,
      bg: BG,
    })
    writeTile(context, context.width, context.height, edge.right, y, {
      char: 179,
      color: FG,
      bg: BG,
    })
  }

  const egtop = `$196`.repeat(edge.width - 4)
  setupeditoritem(false, false, 0, 0, context, 0, 0, 0)
  tokenizeandwritetextformat(`$213$205$187${egtop}$191`, context, true)

  const bottomchrs = `$205`.repeat(edge.width - 2)
  setupeditoritem(false, false, 0, edge.height - 1, context, 0, 0, 0)
  tokenizeandwritetextformat(`$212${bottomchrs}$190`, context, true)

  const tape = useTape()
  const blink = useBlink()

  const egbottom = `$205`.repeat(edge.width - 4)
  setupeditoritem(false, false, 0, 1, context, 0, 0, 0)
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
  setupeditoritem(false, false, titlex, 0, context, 0, 0, 0)
  tokenizeandwritetextformat(title, context, true)

  return null
}
