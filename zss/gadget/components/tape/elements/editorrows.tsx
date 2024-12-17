import { MODEM_SHARED_STRING } from 'zss/device/modem'
import { useTapeEditor } from 'zss/gadget/data/state'
import { MAYBE, ispresent } from 'zss/mapping/types'
import {
  applycolortoindexes,
  textformatreadedges,
  tokenizeandwritetextformat,
  writeplaintext,
} from 'zss/words/textformat'

import { useBlink, useWriteText } from '../../hooks'
import {
  BG,
  BG_ACTIVE,
  BG_SELECTED,
  EDITOR_CODE_ROW,
  FG_SELECTED,
  setupeditoritem,
} from '../common'

type TextrowsProps = {
  ycursor: number
  xoffset: number
  yoffset: number
  rows: EDITOR_CODE_ROW[]
  codepage: MAYBE<MODEM_SHARED_STRING>
}

export function EditorRows({
  ycursor: cursor,
  xoffset,
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
  const left = edge.left + 1 - xoffset
  setupeditoritem(false, false, 0, -yoffset, context, 1, 2, 1)
  for (let i = 0; i < rows.length; ++i) {
    if (context.y <= edge.top + 1) {
      ++context.y
      continue
    }

    // setup
    const row = rows[i]
    const active = i === cursor
    const text = row.code.replaceAll('\n', '')

    // render
    context.x = left
    context.iseven = context.y % 2 === 0
    context.active.bg = active ? BG_ACTIVE : BG
    context.disablewrap = true
    writeplaintext(`${text}`, context, false)

    // render selection
    if (hasselection && row.start <= ii2 && row.end >= ii1) {
      const index = left + context.y * context.width
      const start = Math.max(0, ii1 - row.start)
      const end = Math.min(row.end - row.start, ii2 - row.start)
      applycolortoindexes(
        index + start,
        index + end,
        FG_SELECTED,
        BG_SELECTED,
        context,
      )
    }

    // next line
    ++context.y
    if (context.y >= edge.bottom) {
      break
    }
  }
  context.disablewrap = false

  return null
}
