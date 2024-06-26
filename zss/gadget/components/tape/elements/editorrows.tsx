import { useWaitForString } from 'zss/device/modem'
import { useTape } from 'zss/device/tape'
import {
  applycolortoindexes,
  textformatedges,
  tokenizeandwritetextformat,
  useWriteText,
  writeplaintext,
  writetextreset,
} from 'zss/gadget/data/textformat'
import { ispresent } from 'zss/mapping/types'

import { useBlink } from '../../useblink'
import {
  BG,
  BG_ACTIVE,
  BG_SELECTED,
  EDITOR_CODE_ROW,
  FG_SELECTED,
  setupeditoritem,
  useTapeEditor,
} from '../common'

type TextrowsProps = {
  ycursor: number
  yoffset: number
  rows: EDITOR_CODE_ROW[]
}

export function EditorRows({ ycursor, yoffset, rows }: TextrowsProps) {
  const tape = useTape()
  const blink = useBlink()
  const context = useWriteText()
  const tapeeditor = useTapeEditor()
  const codepage = useWaitForString(
    tape.editor.book,
    tape.editor.page,
    tape.editor.player,
  )

  const topedge = 2
  const leftedge = 1
  const rightedge = context.width - 2
  const bottomedge = context.height - 2

  if (!ispresent(codepage)) {
    const fibble = (blink ? '|' : '-').repeat(3)
    setupeditoritem(false, false, leftedge, topedge, 1, context)
    tokenizeandwritetextformat(` ${fibble} LOADING ${fibble}`, context, true)
    return null
  }

  let ii1 = tapeeditor.cursor
  let ii2 = tapeeditor.cursor
  let hasselection = false

  // adjust input edges selection
  if (ispresent(tapeeditor.select)) {
    hasselection = true
    ii1 = Math.min(tapeeditor.cursor, tapeeditor.select)
    ii2 = Math.max(tapeeditor.cursor, tapeeditor.select)
    if (tapeeditor.cursor !== tapeeditor.select) {
      // tuck in right side
      --ii2
    }
  }

  // render lines
  setupeditoritem(false, false, leftedge, topedge - yoffset, 1, context)
  for (let i = 0; i < rows.length && context.y <= bottomedge; ++i) {
    // setup
    const row = rows[i]
    const active = i === ycursor
    const text = row.code.replaceAll('\n', '')
    textformatedges(topedge, leftedge, rightedge, bottomedge, context)

    // render
    const ycontext = context.y
    context.iseven = context.y % 2 === 0
    context.active.bg = active ? BG_ACTIVE : BG
    writeplaintext(`${text}`, context, true)
    context.x = leftedge
    ++context.y

    // render selection
    if (hasselection && row.start <= ii2 && row.end >= ii1) {
      const index = (context.active.leftedge ?? 0) + ycontext * context.width
      const start = Math.max(row.start, ii1) - row.start
      const end = Math.min(row.end, ii2) - row.start
      applycolortoindexes(
        index + start,
        index + end,
        FG_SELECTED,
        BG_SELECTED,
        context,
      )
    }
  }

  return null
}
