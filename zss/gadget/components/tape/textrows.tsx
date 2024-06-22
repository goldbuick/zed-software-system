import { useWaitForString } from 'zss/device/modem'
import { useTape } from 'zss/device/tape'
import {
  applycolortoindexes,
  tokenizeandwritetextformat,
  useWriteText,
  writeplaintext,
} from 'zss/gadget/data/textformat'
import { clamp } from 'zss/mapping/number'
import { ispresent } from 'zss/mapping/types'

import { useBlink } from '../useblink'

import {
  BG,
  BG_ACTIVE,
  BG_SELECTED,
  EDITOR_CODE_ROW,
  FG_SELECTED,
  setupeditoritem,
  useTapeEditor,
} from './common'

type TextrowsProps = {
  ycursor: number
  leftedge: number
  rightedge: number
  topedge: number
  bottomedge: number
  rows: EDITOR_CODE_ROW[]
}

export function Textrows({
  ycursor,
  leftedge,
  rightedge,
  topedge,
  bottomedge,
  rows,
}: TextrowsProps) {
  const tape = useTape()
  const blink = useBlink()
  const context = useWriteText()
  const tapeeditor = useTapeEditor()
  const codepage = useWaitForString(
    tape.editor.book,
    tape.editor.page,
    tape.editor.player,
  )

  setupeditoritem(false, false, 1, 2, 1, context)
  if (!ispresent(codepage)) {
    const fibble = (blink ? '|' : '-').repeat(3)
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

  // ---
  const halfviewheight = Math.round((context.height - 3) * 0.5)
  const yoffset = clamp(
    ycursor - halfviewheight,
    0,
    rows.length - halfviewheight,
  )
  setupeditoritem(false, false, leftedge, topedge - yoffset, 1, context)
  for (let i = 0; i < rows.length && context.y <= bottomedge; ++i) {
    // setup
    const row = rows[i]
    const active = i === ycursor
    const text = row.code.replaceAll('\n', '')

    // render
    context.iseven = context.y % 2 === 0
    context.activebg = active ? BG_ACTIVE : BG
    const ycontext = context.y
    writeplaintext(`${text}`, context, true)

    // render selection
    if (hasselection && row.start <= ii2 && row.end >= ii1) {
      const index = (context.leftedge ?? 0) + ycontext * context.width
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
