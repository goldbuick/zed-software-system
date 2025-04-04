import { useTape } from 'zss/gadget/data/state'
import { useBlink, useWriteText, writeTile } from 'zss/gadget/hooks'
import { ismac, metakey } from 'zss/words/system'
import {
  textformatreadedges,
  tokenizeandmeasuretextformat,
  tokenizeandwritetextformat,
} from 'zss/words/textformat'
import { COLOR } from 'zss/words/types'
import { useShallow } from 'zustand/react/shallow'

import { Marquee } from '../scroll/marquee'
import { bgcolor, setupeditoritem } from '../tape/common'

export function EditorFrame() {
  const context = useWriteText()
  const edge = textformatreadedges(context)

  const [quickterminal, editortype, editortitle] = useTape(
    useShallow((state) => [
      state.quickterminal,
      state.editor.type,
      state.editor.title,
    ]),
  )
  const FG = COLOR.WHITE
  const BG = bgcolor(quickterminal)

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

  setupeditoritem(false, false, 0, 0, context, 0, 0, 0)
  tokenizeandwritetextformat(`$213$205$187`, context, true)

  setupeditoritem(false, false, context.width - 3, 0, context, 0, 0, 0)
  tokenizeandwritetextformat(`$196$196$191`, context, true)

  const bottomchrs = `$205`.repeat(edge.width - 2)
  setupeditoritem(false, false, 0, edge.height - 1, context, 0, 0, 0)
  tokenizeandwritetextformat(`$212${bottomchrs}$190`, context, true)

  const blink = useBlink()

  const egbottom = `$205`.repeat(edge.width - 4)
  setupeditoritem(false, false, 0, 1, context, 0, 0, 0)
  tokenizeandwritetextformat(
    `$179$${blink ? '7' : '232'}$200${egbottom}$181`,
    context,
    true,
  )

  // make label
  const label = `$blue[${editortype}] `

  // write name
  const title = ` ${label}$green${editortitle}$white `
  const result = tokenizeandmeasuretextformat(title, edge.width, edge.height)
  const titlewidth = result?.measuredwidth ?? 1
  const centerwidth = edge.width - 2
  const titlex =
    2 + Math.round(centerwidth * 0.5) - Math.round(titlewidth * 0.5)
  setupeditoritem(false, false, titlex, 1, context, 0, 0, 0)
  tokenizeandwritetextformat(title, context, true)

  const metaundo = ismac ? `shift+${metakey}+z` : `${metakey}+y`
  return (
    <Marquee
      margin={3}
      color={COLOR.BLUE}
      y={edge.top}
      leftedge={0}
      rightedge={edge.width - 1}
      line={`
    esc/cancel$white.CLOSE   $blue
    tab$white.CHANGE LAYOUT   $blue
    hold shift$white.SELECT TEXT   $blue
    alt+up/down$white.JUMP 10 LINES   $blue
    alt+left/right$white.JUMP 10 COLS   $blue
    ${metakey}+up/down$white.JUMP TOP/BOTTOM   $blue
    ${metakey}+left/right$white.JUMP TO START/END OF LINE   $blue
    ${metakey}+a$white.SELECT ALL   $blue
    ${metakey}+c$white.COPY   $blue
    ${metakey}+x$white.CUT   $blue
    ${metakey}+v$white.PASTE   $blue
    ${metakey}+z$white.UNDO   $blue
    ${metaundo}$white.REDO   $blue
    ${metakey}+p$white.TEST SELECTED CODE   $blue
    ${metakey}+k$white.PICK REFSHEET   $blue
    ${metakey}+e$white.COPY CODEPAGE TO CLIPBOARD AS JSON   $blue
    `}
      context={context}
    />
  )
}
