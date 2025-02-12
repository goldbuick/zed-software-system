import { useTape } from 'zss/gadget/data/state'
import { useBlink, useWriteText, writeTile } from 'zss/gadget/hooks'
import {
  textformatreadedges,
  tokenizeandmeasuretextformat,
  tokenizeandwritetextformat,
} from 'zss/words/textformat'
import { useShallow } from 'zustand/react/shallow'

import { BG, FG, setupeditoritem } from '../tape/common'

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

  const [editortype, editortitle] = useTape(
    useShallow((state) => [state.editor.type, state.editor.title]),
  )

  const blink = useBlink()

  const egbottom = `$205`.repeat(edge.width - 4)
  setupeditoritem(false, false, 0, 1, context, 0, 0, 0)
  tokenizeandwritetextformat(
    `$179$${blink ? '7' : '232'}$200${egbottom}$181`,
    context,
    true,
  )

  // make label
  const label = `[${editortype}] `

  // write name
  const title = ` ${label}${editortitle} `
  const result = tokenizeandmeasuretextformat(title, edge.width, edge.height)
  const titlewidth = result?.measuredwidth ?? 1
  const titlex = Math.round(edge.width * 0.5) - Math.round(titlewidth * 0.5)
  setupeditoritem(false, false, titlex, 0, context, 0, 0, 0)
  tokenizeandwritetextformat(title, context, true)

  return null
}
