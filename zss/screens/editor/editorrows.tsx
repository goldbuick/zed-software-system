import { useEffect, useMemo } from 'react'
import type { SharedTextHandle } from 'zss/device/modem'
import { useEditor, useTape } from 'zss/gadget/data/zustandstores'
import { useWriteText } from 'zss/gadget/writetext'
import { codeunitoffsettocellindex } from 'zss/mapping/grapheme'
import { MAYBE, ispresent } from 'zss/mapping/types'
import {
  BG_ACTIVE,
  BG_FIND_CURRENT,
  BG_FIND_MATCH,
  BG_SELECTED,
  FG_FIND_CURRENT,
  FG_FIND_MATCH,
  FG_SELECTED,
  ZSS_TYPE_ERROR,
  ZSS_TYPE_ERROR_LINE,
  ZSS_TYPE_LINE,
  applycodetokencolors,
  bgcolorformode,
} from 'zss/screens/tape/colors'
import { EDITOR_CODE_ROW, setupeditoritem } from 'zss/screens/tape/common'
import {
  clippedapplybgtoindexes,
  clippedapplycolortoindexes,
  textformatreadedges,
  tokenizeandwritetextformat,
  writeplaintext,
} from 'zss/words/textformat'
import { COLOR } from 'zss/words/types'
import { useShallow } from 'zustand/react/shallow'

import { editorfindmatches } from './editorfind'

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
  const tapeeditor = useEditor(
    useShallow((state) => ({
      cursor: state.cursor,
      select: state.select,
      xscroll: state.xscroll,
      yscroll: state.yscroll,
      startline: state.startline,
      findquery: state.findquery,
      findcasesensitive: state.findcasesensitive,
      findmatchindex: state.findmatchindex,
      findopen: state.findopen,
    })),
  )
  const terminalmode = useTape((state) => state.terminalmode)
  const istxtpage = useTape((state) => state.editor.type === 'txt')

  const withrows: EDITOR_CODE_ROW[] = useMemo(() => {
    if (rows.length) {
      const last = rows[rows.length - 1]
      return [...rows, { code: '', start: last.end + 1, end: last.end + 1 }]
    }
    return []
  }, [rows])

  const strvalue = ispresent(codepage) ? codepage.toJSON() : ''
  const findmatches = useMemo(() => {
    if (!tapeeditor.findopen || tapeeditor.findquery.length === 0) {
      return []
    }
    return editorfindmatches(
      strvalue,
      tapeeditor.findquery,
      tapeeditor.findcasesensitive,
    )
  }, [
    strvalue,
    tapeeditor.findopen,
    tapeeditor.findquery,
    tapeeditor.findcasesensitive,
  ])

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
    const fibble = '$196'.repeat(5)
    setupeditoritem(false, false, 0, 0, context, 1, 2, 1)
    tokenizeandwritetextformat(
      `$BLWHITE${fibble}$WHITELOADING$BLWHITE${fibble}$WHITE`,
      context,
      false,
    )
    return null
  }

  const rightedge = context.width - 2
  const edge = textformatreadedges(context)
  edge.right = rightedge - 1
  const rowbottom = tapeeditor.findopen ? edge.bottom - 1 : edge.bottom

  let ii1 = tapeeditor.cursor
  let ii2 = tapeeditor.cursor
  let hasselection = false

  if (ispresent(tapeeditor.select)) {
    hasselection = true
    ii1 = Math.min(tapeeditor.cursor, tapeeditor.select)
    ii2 = Math.max(tapeeditor.cursor, tapeeditor.select)
    if (tapeeditor.cursor !== tapeeditor.select) {
      --ii2
    }
  }

  const baseleft = edge.left + 1 - 4
  context.active.leftedge = edge.left + 1
  context.x = context.active.leftedge - xoffset
  context.y = edge.top - yoffset + 2
  for (let i = 0; i < withrows.length; ++i) {
    if (context.y <= edge.top + 1) {
      ++context.y
      continue
    }

    const row = withrows[i]
    const prow = withrows[i - 1]
    const active = i === cursor
    const pactive = i - 1 === cursor
    const text = row.code.replaceAll('\n', '')

    const leftedge = baseleft - xoffset
    context.x = leftedge
    context.iseven = context.y % 2 === 0
    context.active.color = COLOR.WHITE
    context.active.bg = active ? BG_ACTIVE : bgcolorformode(terminalmode)
    context.disablewrap = true
    context.active.rightedge = rightedge

    const linenumber = `${i + 1}`.padStart(3, ' ')
    const prefix = `${i < rows.length ? linenumber : '   '} `
    const prefixcells = codeunitoffsettocellindex(prefix, prefix.length)
    writeplaintext(`${prefix}${text} `, context, false)

    const rowindex = context.y * context.width
    const leftclip = context.active.leftedge
    const rightclip = edge.right
    clippedapplycolortoindexes(
      rowindex,
      leftedge,
      leftclip,
      rightclip,
      0,
      prefixcells - 1,
      ZSS_TYPE_LINE,
      context.active.bg,
      context,
    )

    if (!istxtpage) {
      applycodetokencolors(
        rowindex,
        leftedge,
        leftclip,
        rightclip,
        row.tokens ?? [],
        context,
        text,
        prefixcells,
      )
    }

    if (hasselection && row.start <= ii2 && row.end >= ii1) {
      const maybestart = Math.max(row.start, ii1) - row.start
      const maybeend = Math.min(row.end, ii2) - row.start
      clippedapplycolortoindexes(
        rowindex,
        leftedge,
        leftclip,
        rightclip,
        prefixcells + maybestart,
        prefixcells + maybeend,
        FG_SELECTED,
        BG_SELECTED,
        context,
      )
    }

    if (
      tapeeditor.findopen &&
      tapeeditor.findquery.length > 0 &&
      findmatches.length > 0
    ) {
      for (let m = 0; m < findmatches.length; ++m) {
        const match = findmatches[m]
        if (row.start > match.end - 1 || row.end < match.start) {
          continue
        }
        const maybestart = Math.max(row.start, match.start) - row.start
        const maybeend = Math.min(row.end, match.end - 1) - row.start
        if (maybeend < maybestart) {
          continue
        }
        const iscurrent = m === tapeeditor.findmatchindex
        clippedapplycolortoindexes(
          rowindex,
          leftedge,
          leftclip,
          rightclip,
          prefixcells + maybestart,
          prefixcells + maybeend,
          iscurrent ? FG_FIND_CURRENT : FG_FIND_MATCH,
          iscurrent ? BG_FIND_CURRENT : BG_FIND_MATCH,
          context,
        )
      }
    }

    const [maybeerror] = row.errors ?? []
    if (pactive && ispresent(prow.errors)) {
      context.x = leftedge
      const [maybeperror] = prow.errors
      const msg = `${maybeperror.message}`.replaceAll('\n', ' ')
      writeplaintext(msg, context, false)
      clippedapplycolortoindexes(
        rowindex,
        leftedge,
        leftclip,
        rightclip,
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
        rowindex,
        leftedge,
        leftclip,
        rightclip,
        0,
        prefixcells - 1,
        ZSS_TYPE_ERROR_LINE,
        context,
      )
      clippedapplybgtoindexes(
        rowindex,
        leftedge,
        leftclip,
        rightclip,
        column,
        column + length - 1,
        ZSS_TYPE_ERROR,
        context,
      )
    }

    ++context.y
    if (context.y >= rowbottom) {
      break
    }
  }

  context.disablewrap = false
  context.active.rightedge = context.width

  return null
}
