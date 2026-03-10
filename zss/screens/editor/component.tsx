import { useEffect, useMemo } from 'react'
import { objectKeys } from 'ts-extras'
import { vmcodeaddress, vmcoderelease, vmcodewatch } from 'zss/device/api'
import { useWaitForValueString } from 'zss/device/modem'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { useEditor, useGadgetClient, useTape } from 'zss/gadget/data/state'
import { useWriteText } from 'zss/gadget/writetext'
import { compileast } from 'zss/lang/ast'
import * as lexer from 'zss/lang/lexer'
import { createlineindexes } from 'zss/lang/transformer'
import { CodeNode, NODE } from 'zss/lang/visitor'
import { isarray, isnumber, ispresent } from 'zss/mapping/types'
import { getautocomplete } from 'zss/screens/tape/autocomplete'
import { TapeBackPlate } from 'zss/screens/tape/backplate'
import { buildzsswordcolors } from 'zss/screens/tape/colors'
import { findcursorinrows, splitcoderows } from 'zss/screens/tape/common'
import { ismac, metakey } from 'zss/words/system'
import { textformatreadedges } from 'zss/words/textformat'
import { COLOR } from 'zss/words/types'
import { useShallow } from 'zustand/react/shallow'

import { ScrollMarquee } from '../scroll/marquee'

import { EditorFrame } from './editorframe'
import { EditorInput } from './editorinput'
import { EditorRows, EditorRowsProps } from './editorrows'

export function EditorComponent() {
  const context = useWriteText()
  const player = registerreadplayer()
  const zsswords = useGadgetClient((state) => state.zsswords)
  const [editor] = useTape(useShallow((state) => [state.editor]))
  const autocompleteindex = useTape((state) => state.autocompleteindex)

  const tapeeditor = useEditor()
  const codepage = useWaitForValueString(
    vmcodeaddress(editor.book, editor.path),
  )

  useEffect(() => {
    vmcodewatch(SOFTWARE, player, editor.book, editor.path)
    return () => {
      vmcoderelease(SOFTWARE, player, editor.book, editor.path)
    }
  }, [editor.book, editor.path, player])

  // get current string value of code
  const strvalue = ispresent(codepage) ? codepage.toJSON() : ''

  // tokenize, parse, and fold into rows (only re-run when text changes)
  const rows = useMemo(() => {
    const rows = splitcoderows(strvalue)
    const parsed = compileast(strvalue)

    // fold tokens into lines
    if (ispresent(parsed.tokens)) {
      let isfirst = true
      for (let i = 0; i < parsed.tokens.length; ++i) {
        const token = parsed.tokens[i]
        if (token.tokenTypeIdx === lexer.stat.tokenTypeIdx) {
          // payload marks which stat is first
          token.payload = isfirst
          isfirst = false
        }
        const row = rows[(token.startLine ?? 1) - 1]
        if (ispresent(row)) {
          row.tokens = row.tokens ?? []
          row.tokens.push(token)
        }
      }
    }

    // fold ast into lines
    if (parsed?.ast?.type === NODE.PROGRAM) {
      createlineindexes(parsed.ast)
      const queue: CodeNode[] = []
      for (let i = 1; i < parsed.ast.lines.length; ++i) {
        queue.push(parsed.ast.lines[i])
      }
      while (queue.length) {
        const node = queue.pop()
        if (isnumber(node?.type)) {
          switch (node.type) {
            case NODE.LINE:
            case NODE.IF:
              if (isnumber(node.startLine)) {
                const row = rows[node.startLine - 1]
                row.asts = row.asts ?? []
                row.asts.unshift(node)
              }
              break
          }
          const propnames = objectKeys(node)
          for (let i = 0; i < propnames.length; ++i) {
            const prop = propnames[i]
            const value = node[prop]
            if (isarray(value)) {
              queue.push(...value)
            } else if (typeof value === 'object') {
              // @ts-expect-error its okay
              queue.push(value)
            }
          }
        }
      }
    }

    // fold errors into lines
    if (ispresent(parsed.errors)) {
      for (let i = 0; i < parsed.errors.length; ++i) {
        const error = parsed.errors[i]
        const row = rows[(error.line ?? 1) - 1]
        if (ispresent(row)) {
          row.errors = row.errors ?? []
          row.errors.push(error)
        }
      }
    }

    // warn when a label name shadows a command
    const commandnames = new Set<string>()
    if (ispresent(zsswords)) {
      for (const k of objectKeys(zsswords.langcommands ?? {})) {
        commandnames.add(k.toLowerCase())
      }
      for (const k of objectKeys(zsswords.clicommands ?? {})) {
        commandnames.add(k.toLowerCase())
      }
      for (const k of objectKeys(zsswords.loadercommands ?? {})) {
        commandnames.add(k.toLowerCase())
      }
      for (const k of objectKeys(zsswords.runtimecommands ?? {})) {
        commandnames.add(k.toLowerCase())
      }
    }
    if (ispresent(parsed.tokens)) {
      for (let i = 0; i < parsed.tokens.length; ++i) {
        const token = parsed.tokens[i]
        if (
          token.tokenTypeIdx === lexer.label.tokenTypeIdx &&
          token.startColumn === 1
        ) {
          const labelname = token.image.slice(1).trim().toLowerCase()
          if (commandnames.has(labelname)) {
            const row = rows[(token.startLine ?? 1) - 1]
            if (ispresent(row)) {
              row.errors = row.errors ?? []
              row.errors.push({
                offset: token.startOffset,
                line: token.startLine,
                column: token.startColumn,
                length: token.image.length,
                message: `label ':${labelname}' shadows #${labelname} command`,
              })
            }
          }
        }
      }
    }

    return rows
  }, [strvalue, zsswords])

  // cursor placement
  const ycursor = findcursorinrows(tapeeditor.cursor, rows)
  const xcursor = tapeeditor.cursor - rows[ycursor].start

  const autocomplete = useMemo(() => {
    buildzsswordcolors(zsswords)
    const coderow = rows[ycursor]
    return getautocomplete(coderow, tapeeditor.cursor, zsswords)
  }, [rows, ycursor, tapeeditor.cursor, zsswords])

  const autocompleteactive =
    autocompleteindex >= 0 && autocomplete.suggestions.length > 0

  const props: EditorRowsProps = {
    rows,
    xcursor,
    ycursor,
    codepage,
    xoffset: -4 + tapeeditor.xscroll,
    yoffset: tapeeditor.yscroll,
  }

  const metaundo = ismac ? `shift+${metakey}+z` : `${metakey}+y`
  const edge = textformatreadedges(context)

  return (
    <>
      <TapeBackPlate bump />
      <EditorFrame />
      <ScrollMarquee
        margin={3}
        color={COLOR.BLUE}
        y={edge.top}
        leftedge={0}
        rightedge={edge.width - 1}
        line={`
keys: $whiteesc/cancel$green.CLOSE 
$whitetab$green.CHANGE LAYOUT 
$whitehold shift$green.SELECT TEXT 
$whitealt+up/down$green.JUMP 10 LINES 
$whitealt+left/right$green.JUMP 10 COLS 
$white$meta+up/down$green.JUMP TOP/BOTTOM 
$white$meta+left/right$green.JUMP TO START/END OF LINE 
$white$meta+a$green.SELECT ALL 
$white$meta+c$green.COPY 
$white$meta+x$green.CUT 
$white$meta+v$green.PASTE 
$white$meta+z$green.UNDO 
$white${metaundo}$green.REDO 
$white$meta+p / $meta+r$green.RUN SELECTED CODE 
$white$meta+h$green.OPEN HELPSCROLL $blue
    `}
      />
      <EditorRows {...props} />
      <EditorInput
        {...props}
        autocomplete={autocomplete}
        autocompleteactive={autocompleteactive}
      />
    </>
  )
}
