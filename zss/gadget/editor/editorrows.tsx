import { useMemo } from 'react'
import { Y } from 'zss/device/modem'
import { useTape, useTapeEditor } from 'zss/gadget/data/state'
import * as lexer from 'zss/lang/lexer'
import { clamp } from 'zss/mapping/number'
import { MAYBE, isarray, ispresent, isstring } from 'zss/mapping/types'
import { ROM_LOOKUP, romintolookup, romread } from 'zss/rom'
import { statformat } from 'zss/words/stats'
import {
  clippedapplybgtoindexes,
  clippedapplycolortoindexes,
  textformatreadedges,
  tokenizeandwritetextformat,
  writeplaintext,
} from 'zss/words/textformat'
import { COLOR, STAT_TYPE } from 'zss/words/types'

import { useBlink, useWriteText, writeTile } from '../hooks'
import {
  BG_ACTIVE,
  BG_SELECTED,
  bgcolor,
  EDITOR_CODE_ROW,
  FG,
  FG_SELECTED,
  setupeditoritem,
} from '../tape/common'

import {
  ZSS_COLOR_MAP,
  ZSS_TYPE_ERROR,
  ZSS_TYPE_ERROR_LINE,
  ZSS_TYPE_LINE,
  ZSS_TYPE_NUMBER,
  ZSS_TYPE_OBJNAME,
  ZSS_TYPE_STATNAME,
  ZSS_TYPE_TEXT,
  zsswordcolor,
} from './colors'

export type EditorRowsProps = {
  xcursor: number
  ycursor: number
  xoffset: number
  yoffset: number
  rows: EDITOR_CODE_ROW[]
  codepage: MAYBE<Y.Text>
}

export function EditorRows({
  ycursor: cursor,
  xoffset,
  yoffset,
  rows,
  codepage,
}: EditorRowsProps) {
  const blink = useBlink()
  const context = useWriteText()
  const tapeeditor = useTapeEditor()
  const { editor, quickterminal } = useTape()
  const withrows: EDITOR_CODE_ROW[] = useMemo(() => {
    if (rows.length) {
      const last = rows[rows.length - 1]
      return [...rows, { code: '', start: last.end + 1, end: last.end + 1 }]
    }
    return []
  }, [rows])

  if (!ispresent(codepage)) {
    const fibble = (blink ? '|' : '-').repeat(3)
    setupeditoritem(false, false, 0, 0, context, 1, 2, 1)
    tokenizeandwritetextformat(` ${fibble} LOADING ${fibble}`, context, true)
    return null
  }

  const hasrefsheet = editor.refsheet.length > 0
  const rightedge = context.width - (hasrefsheet ? 28 : 2)
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
  setupeditoritem(false, false, -xoffset, -yoffset, context, 1, 2, 1)
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
    context.active.bg = active ? BG_ACTIVE : bgcolor(quickterminal)
    context.disablewrap = true
    context.active.rightedge = rightedge
    const [maybeerror] = row.errors ?? []
    const linenumber = `${i + 1}`.padStart(3, ' ')
    writeplaintext(
      `${i < rows.length ? linenumber : '   '} ${text} `,
      context,
      false,
    )

    // calc base index
    const index = 1 + context.y * context.width
    clippedapplycolortoindexes(
      index,
      edge.right,
      -xoffset - 3,
      -xoffset,
      ZSS_TYPE_LINE,
      context.active.bg,
      context,
    )

    // apply token colors
    let activetokenidx = -1
    const cursorcolumn = clamp(
      tapeeditor.cursor - row.start,
      1,
      row.end - row.start,
    )
    if (ispresent(row.tokens)) {
      for (let t = 0; t < row.tokens.length; ++t) {
        const token = row.tokens[t]
        if (
          active &&
          cursorcolumn >= (token.startColumn ?? 1) &&
          cursorcolumn <= (token.endColumn ?? 1)
        ) {
          activetokenidx = t
        }
        const left = (token.startColumn ?? 1) - 1 - xoffset
        const right = (token.endColumn ?? 1) - 1 - xoffset
        const maybecolor = ZSS_COLOR_MAP[token.tokenTypeIdx]
        if (ispresent(maybecolor)) {
          switch (maybecolor) {
            case ZSS_TYPE_OBJNAME: {
              const words = token.image.substring(1).split(' ')
              const statinfo = statformat('', words, !!token.payload)
              switch (statinfo.type) {
                case STAT_TYPE.LOADER:
                case STAT_TYPE.BOARD:
                case STAT_TYPE.OBJECT:
                case STAT_TYPE.TERRAIN:
                case STAT_TYPE.CHARSET:
                case STAT_TYPE.PALETTE: {
                  const [first] = words
                  clippedapplycolortoindexes(
                    index,
                    edge.right,
                    left,
                    left + first.length,
                    ZSS_TYPE_OBJNAME,
                    context.active.bg,
                    context,
                  )
                  if (words.length > 1) {
                    clippedapplycolortoindexes(
                      index,
                      edge.right,
                      left + first.length + 1,
                      right,
                      ZSS_TYPE_TEXT,
                      context.active.bg,
                      context,
                    )
                  }
                  break
                }
                case STAT_TYPE.CONST: {
                  const [first] = words
                  clippedapplycolortoindexes(
                    index,
                    edge.right,
                    left,
                    left + first.length,
                    ZSS_TYPE_STATNAME,
                    context.active.bg,
                    context,
                  )
                  if (words.length > 1) {
                    clippedapplycolortoindexes(
                      index,
                      edge.right,
                      left + first.length + 1,
                      right,
                      ZSS_TYPE_NUMBER,
                      context.active.bg,
                      context,
                    )
                  }
                  break
                }
                case STAT_TYPE.RANGE:
                case STAT_TYPE.SELECT:
                case STAT_TYPE.NUMBER:
                case STAT_TYPE.TEXT:
                case STAT_TYPE.HOTKEY:
                case STAT_TYPE.COPYIT:
                case STAT_TYPE.OPENIT:
                case STAT_TYPE.ZSSEDIT:
                case STAT_TYPE.CHAREDIT:
                case STAT_TYPE.COLOREDIT: {
                  const [first] = words
                  clippedapplycolortoindexes(
                    index,
                    edge.right,
                    left,
                    left + first.length,
                    ZSS_TYPE_OBJNAME,
                    context.active.bg,
                    context,
                  )
                  break
                }
                default:
                  clippedapplycolortoindexes(
                    index,
                    edge.right,
                    left,
                    right,
                    COLOR.DKRED,
                    context.active.bg,
                    context,
                  )
                  break
              }
              break
            }
            case ZSS_TYPE_TEXT: {
              const wordcolor = zsswordcolor(token.image)
              if (isarray(wordcolor)) {
                for (let c = 0; c < wordcolor.length; ++c) {
                  clippedapplycolortoindexes(
                    index,
                    edge.right,
                    left + c,
                    right + c,
                    wordcolor[c],
                    context.active.bg,
                    context,
                  )
                }
              } else {
                clippedapplycolortoindexes(
                  index,
                  edge.right,
                  left,
                  right,
                  wordcolor,
                  context.active.bg,
                  context,
                )
              }
              break
            }
            default:
              clippedapplycolortoindexes(
                index,
                edge.right,
                left,
                right,
                maybecolor,
                context.active.bg,
                context,
              )
              break
          }
        }
      }
    }

    // render selection
    if (hasselection && row.start <= ii2 && row.end >= ii1) {
      const maybestart = Math.max(row.start, ii1) - row.start - xoffset
      const maybeend = Math.min(row.end, ii2) - row.start - xoffset

      // start of drawn line
      const right = edge.width - 3
      const start = Math.max(0, maybestart)
      const end = Math.min(right, maybeend)

      if (start <= right && end >= baseleft) {
        clippedapplycolortoindexes(
          index,
          edge.right,
          start,
          end,
          FG_SELECTED,
          BG_SELECTED,
          context,
        )
      }
    }

    // render hints
    if (active && ispresent(row.tokens)) {
      let lookup: MAYBE<ROM_LOOKUP>

      // scan for hint category indicator
      for (let c = activetokenidx; c >= 0; --c) {
        const token = row.tokens[c]
        switch (token.tokenTypeIdx) {
          case lexer.command.tokenTypeIdx:
          case lexer.stat.tokenTypeIdx:
          case lexer.label.tokenTypeIdx:
          case lexer.comment.tokenTypeIdx:
          case lexer.hyperlink.tokenTypeIdx:
          case lexer.query.tokenTypeIdx:
          case lexer.divide.tokenTypeIdx:
          case lexer.text.tokenTypeIdx:
            break
          default:
            continue
        }
        switch (token.tokenTypeIdx) {
          case lexer.command.tokenTypeIdx: {
            const rom = romread(`editor:command:${row.tokens[c + 1].image}`)
            if (ispresent(rom)) {
              lookup = romintolookup(rom)
            }
            break
          }
          case lexer.stat.tokenTypeIdx:
            console.info(token.image)
            break
          case lexer.label.tokenTypeIdx: {
            const rom = romread(`editor:label`)
            if (ispresent(rom)) {
              lookup = romintolookup(rom)
            }
            break
          }
          case lexer.comment.tokenTypeIdx: {
            const rom = romread(`editor:comment`)
            if (ispresent(rom)) {
              lookup = romintolookup(rom)
            }
            break
          }
          case lexer.hyperlink.tokenTypeIdx: {
            // const rom = romread(`editor:label`)
            // if (ispresent(rom)) {
            //   lookup = romintolookup(rom)
            // }
            break
          }
          case lexer.query.tokenTypeIdx: {
            // const rom = romread(`editor:label`)
            // if (ispresent(rom)) {
            //   lookup = romintolookup(rom)
            // }
            break
          }
          case lexer.divide.tokenTypeIdx: {
            // const rom = romread(`editor:label`)
            // if (ispresent(rom)) {
            //   lookup = romintolookup(rom)
            // }
            break
          }
          case lexer.text.tokenTypeIdx: {
            // const rom = romread(`editor:label`)
            // if (ispresent(rom)) {
            //   lookup = romintolookup(rom)
            // }
            break
          }
        }
        break
      }

      if (ispresent(lookup)) {
        if (isstring(lookup.desc)) {
          tokenizeandwritetextformat(lookup.desc, context, false)
        }
      }
    }

    // apply error and info meta
    if (pactive && ispresent(prow.errors)) {
      context.x = leftedge
      const [maybeperror] = prow.errors
      const msg = `${maybeperror.message}`.replaceAll('\n', ' ')
      writeplaintext(msg, context, false)
      clippedapplybgtoindexes(
        index,
        edge.right,
        0,
        msg.length - 1,
        ZSS_TYPE_ERROR_LINE,
        context,
      )
    } else if (ispresent(maybeerror)) {
      const column = 3 + (maybeerror.column ?? 1)
      const length = maybeerror.length ?? 1
      clippedapplybgtoindexes(
        index,
        edge.right,
        0,
        2,
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

  // render ref page
  if (hasrefsheet) {
    let i = 0
    for (let y = edge.top + 2; y < edge.bottom; ++y) {
      context.active.rightedge = context.width - 2
      context.active.leftedge = edge.right + 2
      writeTile(context, context.width, context.height, edge.right + 1, y, {
        char: 179,
        color: FG,
        bg: COLOR.DKBLUE,
      })
      const refsheetrow = editor.refsheet[i++]
      if (ispresent(refsheetrow)) {
        context.x = context.active.leftedge - 1
        context.y = y
        tokenizeandwritetextformat(
          `$white$ondkblue ${refsheetrow}`,
          context,
          true,
        )
      }
    }
  }

  // reset edge
  context.disablewrap = false
  context.active.rightedge = context.width

  return null
}
