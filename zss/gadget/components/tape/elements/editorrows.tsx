import { MODEM_SHARED_STRING } from 'zss/device/modem'
import {
  applycolortoindexes,
  textformatedges,
  textformatreadedges,
  tokenizeandwritetextformat,
  useWriteText,
  writeplaintext,
} from 'zss/gadget/data/textformat'
import { MAYBE, ispresent } from 'zss/mapping/types'

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
  codepage: MAYBE<MODEM_SHARED_STRING>
}

export function EditorRows({
  ycursor,
  yoffset,
  rows,
  codepage,
}: TextrowsProps) {
  const blink = useBlink()
  const context = useWriteText()
  const tapeeditor = useTapeEditor()
  const edge = textformatreadedges(context)

  if (!ispresent(codepage)) {
    const fibble = (blink ? '|' : '-').repeat(3)
    setupeditoritem(false, false, 0, 0, context, 1, 2, 1)
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
  setupeditoritem(false, false, 0, -yoffset, context, 1, 2, 1)
  textformatedges(edge.top, edge.left, edge.right, edge.bottom, context)
  for (let i = 0; i < rows.length && context.y < edge.bottom - 1; ++i) {
    // setup
    const row = rows[i]

    // const yrow = i + 2
    const active = i === ycursor
    const text = row.code.replaceAll('\n', '')

    // render
    context.iseven = context.y % 2 === 0
    context.active.bg = active ? BG_ACTIVE : BG

    writeplaintext(`${text}`, context, true)
    context.x = edge.left + 1
    ++context.y

    // render selection
    if (hasselection && row.start <= ii2 && row.end >= ii1) {
      const sx = edge.left
      const sy = edge.top
      const index = sx + sy * context.width
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
