import { useEffect, useMemo } from 'react'
import type { SharedTextHandle } from 'zss/device/modem'
import { useEditor, useTape } from 'zss/gadget/data/state'
import { useWriteText } from 'zss/gadget/writetext'
import { MAYBE, ispresent } from 'zss/mapping/types'
import {
  ZSS_TYPE_ERROR,
  ZSS_TYPE_ERROR_LINE,
  ZSS_TYPE_LINE,
  applycodetokencolors,
} from 'zss/screens/tape/colors'
import {
  BG_ACTIVE,
  BG_SELECTED,
  EDITOR_CODE_ROW,
  FG_SELECTED,
  bgcolor,
  setupeditoritem,
} from 'zss/screens/tape/common'
import {
  clippedapplybgtoindexes,
  clippedapplycolortoindexes,
  codeunitoffsettocellindex,
  textformatreadedges,
  tokenizeandwritetextformat,
  writeplaintext,
} from 'zss/words/textformat'
import { COLOR } from 'zss/words/types'

export type EditorRowsProps = {
  xcursor: number
  ycursor: number
  xoffset: number
  yoffset: number
  rows: EDITOR_CODE_ROW[]
  codepage: MAYBE<SharedTextHandle>
}

export function EditorRows({
  ycursor: cursor,
  xoffset,
  yoffset,
  rows,
  codepage,
}: EditorRowsProps) {
  const context = useWriteText()
  const tapeeditor = useEditor()
  const { quickterminal } = useTape()

  const withrows: EDITOR_CODE_ROW[] = useMemo(() => {
    if (rows.length) {
      const last = rows[rows.length - 1]
      return [...rows, { code: '', start: last.end + 1, end: last.end + 1 }]
    }
    return []
  }, [rows])

  useEffect(() => {
    const mayberow = withrows[tapeeditor.startline]
    if (ispresent(mayberow)) {
      useEditor.setState({
        yscroll: Math.max(0, tapeeditor.startline - 4),
        cursor: mayberow.start,
        startline: -1,
      })
    }
  }, [withrows, tapeeditor.startline, tapeeditor.cursor])

  if (!ispresent(codepage)) {
    const fibble = '*'.repeat(3)
    setupeditoritem(false, false, 0, 0, context, 1, 2, 1)
    tokenizeandwritetextformat(
      ` $BLWHITE${fibble}$WHITE LOADING $BLWHITE${fibble}$WHITE `,
      context,
      false,
    )
    return null
  }

  const rightedge = context.width - 2
  const edge = textformatreadedges(context)
  edge.right = rightedge - 1

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
  const baseleft = edge.left + 1 - 4
  context.active.leftedge = edge.left + 1
  context.x = context.active.leftedge - xoffset
  context.y = edge.top - yoffset + 2
  for (let i = 0; i < withrows.length; ++i) {
    if (context.y <= edge.top + 1) {
      ++context.y
      continue
    }

    // setup
    const row = withrows[i]
    const prow = withrows[i - 1]
    const active = i === cursor
    const pactive = i - 1 === cursor
    const text = row.code.replaceAll('\n', '')

    // render
    const leftedge = baseleft - xoffset
    context.x = leftedge
    context.iseven = context.y % 2 === 0
    context.active.color = COLOR.WHITE
    context.active.bg = active ? BG_ACTIVE : bgcolor(quickterminal)
    context.disablewrap = true
    context.active.rightedge = rightedge

    const linenumber = `${i + 1}`.padStart(3, ' ')
    const prefix = `${i < rows.length ? linenumber : '   '} `
    const prefixcells = codeunitoffsettocellindex(prefix, prefix.length)
    writeplaintext(
      `${prefix}${text} `,
      context,
      false,
    )

    // base index = first cell of this line in the buffer (where writeplaintext started)
    const index = leftedge + context.y * context.width
    clippedapplycolortoindexes(
      index,
      edge.right,
      0,
      prefixcells - 1,
      ZSS_TYPE_LINE,
      context.active.bg,
      context,
    )

    // apply helper ranges
    // sidebar can be 20 characters wide
    clippedapplybgtoindexes(
      index,
      edge.right,
      20,
      20,
      COLOR.DKCYAN,
      context,
    )
    // scroll can be 40 to 50 characters wide
    clippedapplybgtoindexes(
      index,
      edge.right,
      36,
      36,
      COLOR.DKCYAN,
      context,
    )
    clippedapplybgtoindexes(
      index,
      edge.right,
      46,
      46,
      COLOR.DKCYAN,
      context,
    )

    // apply token colors (line = code part; prefix = line number + space)
    applycodetokencolors(
      xoffset,
      index,
      edge.right,
      row.tokens ?? [],
      context,
      text,
      prefixcells,
    )

    // render selection (maybestart/maybeend are offsets within code; add prefixcells for line-relative columns)
    if (hasselection && row.start <= ii2 && row.end >= ii1) {
      const maybestart = Math.max(row.start, ii1) - row.start - xoffset
      const maybeend = Math.min(row.end, ii2) - row.start - xoffset

      const right = edge.width - 3
      const start = Math.max(0, maybestart)
      const end = Math.min(right, maybeend)

      if (start <= right && end >= 0) {
        clippedapplycolortoindexes(
          index,
          edge.right,
          prefixcells + start,
          prefixcells + end,
          FG_SELECTED,
          BG_SELECTED,
          context,
        )
      }
    }

    // apply error and info meta
    const [maybeerror] = row.errors ?? []
    if (pactive && ispresent(prow.errors)) {
      context.x = leftedge
      const [maybeperror] = prow.errors
      const msg = `${maybeperror.message}`.replaceAll('\n', ' ')
      writeplaintext(msg, context, false)
      clippedapplycolortoindexes(
        index,
        edge.right,
        0,
        msg.length - 1,
        COLOR.WHITE,
        ZSS_TYPE_ERROR_LINE,
        context,
      )
    } else if (ispresent(maybeerror)) {
      const column = prefixcells + ((maybeerror.column ?? 1) - 1)
      const length = maybeerror.length ?? 1
      clippedapplybgtoindexes(
        index,
        edge.right,
        0,
        prefixcells - 1,
        ZSS_TYPE_ERROR_LINE,
        context,
      )
      clippedapplybgtoindexes(
        index,
        edge.right,
        column,
        column + length - 1,
        ZSS_TYPE_ERROR,
        context,
      )
    }

    // next line
    ++context.y
    if (context.y >= edge.bottom) {
      break
    }
  }

  // reset edge
  context.disablewrap = false
  context.active.rightedge = context.width

  return null
}
