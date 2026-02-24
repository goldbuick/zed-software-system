import { useEffect, useMemo } from 'react'
import { objectKeys } from 'ts-extras'
import { vmcodeaddress, vmcoderelease, vmcodewatch } from 'zss/device/api'
import { useWaitForValueString } from 'zss/device/modem'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { useEditor, useTape } from 'zss/gadget/data/state'
import { compileast } from 'zss/lang/ast'
import * as lexer from 'zss/lang/lexer'
import { createlineindexes } from 'zss/lang/transformer'
import { CodeNode, NODE } from 'zss/lang/visitor'
import { isarray, isnumber, ispresent } from 'zss/mapping/types'
import { getautocomplete } from 'zss/screens/tape/autocomplete'
import { TapeBackPlate } from 'zss/screens/tape/backplate'
import { findcursorinrows, splitcoderows } from 'zss/screens/tape/common'
import { buildwordcolormap, useZssWords } from 'zss/screens/tape/zsswords'
import { useShallow } from 'zustand/react/shallow'

import {
  ZSS_TYPE_COMMAND,
  ZSS_WORD_COLOR,
  ZSS_WORD_DIR,
  ZSS_WORD_DIRMOD,
  ZSS_WORD_EXPRS,
  ZSS_WORD_FLAG,
  ZSS_WORD_KIND,
  ZSS_WORD_KIND_ALT,
  ZSS_WORD_STAT,
} from './colors'
import { EditorFrame } from './editorframe'
import { EditorInput, EditorInputProps } from './editorinput'
import { EditorRows, EditorRowsProps } from './editorrows'

export function EditorComponent() {
  const player = registerreadplayer()
  const [editor] = useTape(useShallow((state) => [state.editor]))

  const { words, commandnames, commandwords, statwords, allwords, autocompleteWords } =
    useZssWords({ isLoader: editor.type === 'loader' })

  const wordcolors = useMemo(
    () =>
      buildwordcolormap(words, {
        command: ZSS_TYPE_COMMAND,
        flag: ZSS_WORD_FLAG,
        stat: ZSS_WORD_STAT,
        kind: ZSS_WORD_KIND,
        kindalt: ZSS_WORD_KIND_ALT,
        color: ZSS_WORD_COLOR,
        dir: ZSS_WORD_DIR,
        dirmod: ZSS_WORD_DIRMOD,
        exprs: ZSS_WORD_EXPRS,
      }),
    [words],
  )

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
  }, [strvalue, commandnames])

  // cursor placement
  const ycursor = findcursorinrows(tapeeditor.cursor, rows)
  const xcursor = tapeeditor.cursor - rows[ycursor].start

  const autocomplete = useMemo(
    () =>
      getautocomplete(
        rows,
        tapeeditor.cursor,
        ycursor,
        autocompleteWords,
      ),
    [rows, tapeeditor.cursor, ycursor, autocompleteWords],
  )

  // measure edges once
  const props: EditorRowsProps | EditorInputProps = {
    rows,
    xcursor,
    ycursor,
    codepage,
    xoffset: -4 + tapeeditor.xscroll,
    yoffset: tapeeditor.yscroll,
    autocomplete,
  }

  return (
    <>
      <TapeBackPlate bump />
      <EditorFrame />
      <EditorRows {...props} wordcolors={wordcolors} />
      <EditorInput {...props} />
    </>
  )
}
