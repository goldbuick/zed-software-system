import { useMemo } from 'react'
import type { SharedTextHandle } from 'zss/device/modem'
import { useEditor, useGadgetClient, useTape } from 'zss/gadget/data/state'
import { useBlink, useWriteText } from 'zss/gadget/hooks'
import { MAYBE, ispresent } from 'zss/mapping/types'
import { AUTO_COMPLETE, drawautocomplete } from 'zss/screens/tape/autocomplete'
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
  textformatreadedges,
  tokenizeandwritetextformat,
  writeplaintext,
} from 'zss/words/textformat'
import { COLOR } from 'zss/words/types'

// function setlookupaddress(address: string) {
//   useGadgetClient.setState({ lookupaddress: address })
// }

export type EditorRowsProps = {
  xcursor: number
  ycursor: number
  xoffset: number
  yoffset: number
  rows: EDITOR_CODE_ROW[]
  codepage: MAYBE<SharedTextHandle>
  autocomplete: AUTO_COMPLETE
  autocompleteactive: boolean
}

export function EditorRows({
  ycursor: cursor,
  xoffset,
  yoffset,
  rows,
  codepage,
  autocomplete,
  autocompleteactive,
}: EditorRowsProps) {
  const blink = useBlink()
  const context = useWriteText()
  const tapeeditor = useEditor()
  // const editortype = useTape((state) => state.editor.type)
  const { quickterminal } = useTape()

  // const commandMapKey =
  //   editortype === 'loader' ? 'loadercommands' : 'runtimecommands'
  // const commandMap = useGadgetClient((state) => state.zsswords[commandMapKey])

  const lookupaddress = useGadgetClient((state) => state.lookupaddress)

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
    context.active.color = COLOR.WHITE
    context.active.bg = active ? BG_ACTIVE : bgcolor(quickterminal)
    context.disablewrap = true
    context.active.rightedge = rightedge

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
      -xoffset - 4,
      -xoffset,
      ZSS_TYPE_LINE,
      context.active.bg,
      context,
    )

    // apply helper ranges
    // sidebar can be 20 characters wide
    clippedapplybgtoindexes(
      index,
      edge.right,
      -xoffset + 20,
      -xoffset + 20,
      COLOR.DKCYAN,
      context,
    )
    // scroll can be 40 to 50 characters wide
    clippedapplybgtoindexes(
      index,
      edge.right,
      -xoffset + 36,
      -xoffset + 36,
      COLOR.DKCYAN,
      context,
    )
    clippedapplybgtoindexes(
      index,
      edge.right,
      -xoffset + 46,
      -xoffset + 46,
      COLOR.DKCYAN,
      context,
    )

    // apply token colors
    applycodetokencolors(index, xoffset, edge.right, row.tokens ?? [], context)

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
    // if (active && ispresent(row.tokens)) {
    //   let node: MAYBE<CodeNode>
    //   // pick first, or IF
    //   if (ispresent(row.asts)) {
    //     for (let i = 0; i < (row.asts?.length ?? 0); ++i) {
    //       if (row.asts[i].type === NODE.IF) {
    //         node = row.asts[i]
    //       }
    //     }
    //     if (!ispresent(node)) {
    //       node = row.asts.find((el) => cursorcolumn <= (el.endColumn ?? 0))
    //     }
    //   }

    //   // scan for hint category indicator
    //   for (let c = activetokenidx; c >= 0; --c) {
    //     const prevtoken = row.tokens[c - 1]
    //     const token = row.tokens[c]
    //     const nexttoken = row.tokens[c + 1]
    //     switch (token.tokenTypeIdx) {
    //       case lexer.command.tokenTypeIdx:
    //       case lexer.command_do.tokenTypeIdx:
    //       case lexer.command_if.tokenTypeIdx:
    //       case lexer.command_else.tokenTypeIdx:
    //       case lexer.command_ticker.tokenTypeIdx:
    //       case lexer.command_toast.tokenTypeIdx:
    //       case lexer.stat.tokenTypeIdx:
    //       case lexer.label.tokenTypeIdx:
    //       case lexer.comment.tokenTypeIdx:
    //       case lexer.hyperlink.tokenTypeIdx:
    //       case lexer.query.tokenTypeIdx:
    //       case lexer.divide.tokenTypeIdx:
    //       case lexer.text.tokenTypeIdx:
    //         if (
    //           token.tokenTypeIdx === lexer.divide.tokenTypeIdx &&
    //           (!ispresent(node) || token.startColumn !== node.startColumn)
    //         ) {
    //           continue
    //         }
    //         break
    //       default:
    //         continue
    //     }
    //     switch (token.tokenTypeIdx) {
    //       case lexer.command.tokenTypeIdx: {
    //         setlookupaddress(`editor:command:${nexttoken.image}`)
    //         break
    //       }
    //       case lexer.command_do.tokenTypeIdx: {
    //         setlookupaddress(`editor:command:do`)
    //         break
    //       }
    //       case lexer.command_if.tokenTypeIdx: {
    //         setlookupaddress(
    //           prevtoken.tokenTypeIdx === lexer.command_else.tokenTypeIdx
    //             ? `editor:command:elseif`
    //             : `editor:command:if`,
    //         )
    //         break
    //       }
    //       case lexer.command_else.tokenTypeIdx: {
    //         setlookupaddress(
    //           nexttoken.tokenTypeIdx === lexer.command_if.tokenTypeIdx
    //             ? `editor:command:elseif`
    //             : `editor:command:else`,
    //         )
    //         break
    //       }
    //       case lexer.command_ticker.tokenTypeIdx: {
    //         setlookupaddress(`editor:command:ticker`)
    //         break
    //       }
    //       case lexer.command_toast.tokenTypeIdx: {
    //         setlookupaddress(`editor:command:toast`)
    //         break
    //       }
    //       case lexer.stat.tokenTypeIdx: {
    //         const words = parsestatformat(token.image)
    //         const statinfo = statformat('', words, !!token.payload)
    //         const statname = (words[0] ?? '').toLowerCase().trim()
    //         if (statname && ispresent(romread(`editor:stat:${statname}`))) {
    //           setlookupaddress(`editor:stat:${statname}`)
    //         } else {
    //           setlookupaddress(`editor:stat:${stattypestring(statinfo.type)}`)
    //         }
    //         break
    //       }
    //       case lexer.label.tokenTypeIdx: {
    //         setlookupaddress(`editor:label`)
    //         break
    //       }
    //       case lexer.comment.tokenTypeIdx: {
    //         setlookupaddress(`editor:comment`)
    //         break
    //       }
    //       case lexer.hyperlink.tokenTypeIdx: {
    //         // scan tokens until hyperlink text
    //         setlookupaddress(`editor:hyperlink`)
    //         break
    //       }
    //       case lexer.query.tokenTypeIdx: {
    //         setlookupaddress(`editor:shorttry`)
    //         break
    //       }
    //       case lexer.divide.tokenTypeIdx: {
    //         setlookupaddress(`editor:shortgo`)
    //         break
    //       }
    //       case lexer.text.tokenTypeIdx: {
    //         const word = (token.image ?? '').toLowerCase().trim()
    //         const wordCategories = [
    //           'flag',
    //           'stat',
    //           'color',
    //           'dir',
    //           'dirmod',
    //           'expr',
    //         ]
    //         let found = false
    //         if (word) {
    //           for (const cat of wordCategories) {
    //             const addr = `editor:${cat}:${word}`
    //             if (ispresent(romread(addr))) {
    //               setlookupaddress(addr)
    //               found = true
    //               break
    //             }
    //           }
    //         }
    //         if (!found) {
    //           setlookupaddress(`editor:text`)
    //         }
    //         break
    //       }
    //     }
    //     break
    //   }

    //   console.info(lookupaddress)

    //   // When a command token was detected to our left, show args hint from vm data (COMMAND_ARGS_SIGNATURES); otherwise show desc (with format codes)
    //   // const commandName = lookupAddress?.startsWith('editor:command:')
    //   //   ? lookupAddress.slice(17).toLowerCase().trim()
    //   //   : ''
    //   // const commandArgsHint =
    //   //   commandName && commandMap ? (commandMap[commandName] ?? '') : ''
    //   // if (commandArgsHint) {
    //   //   writeplaintext(commandArgsHint, context, false)
    //   // } else if (!commandName && isstring(lookup?.args)) {
    //   //   writeplaintext(stripRomValue(lookup.args), context, false)
    //   // } else if (!commandName && isstring(lookup?.desc)) {
    //   //   tokenizeandwritetextformat(lookup.desc, context, false)
    //   // }
    // }

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

  // render autocomplete dropdown only after user has typed a character
  if (autocompleteactive && autocomplete.suggestions.length > 0) {
    const startx = edge.left + 4 + autocomplete.wordcol
    const starty = edge.top + 2 + cursor - yoffset + 1
    drawautocomplete(
      autocomplete,
      tapeeditor.acindex,
      startx,
      starty,
      edge,
      context,
    )
  }

  // reset edge
  context.disablewrap = false
  context.active.rightedge = context.width

  return null
}
