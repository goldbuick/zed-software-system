import { useEffect } from 'react'
import { objectKeys } from 'ts-extras'
import { vmcodeaddress, vmcoderelease, vmcodewatch } from 'zss/device/api'
import { useWaitForValueString } from 'zss/device/modem'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { useEditor, useGadgetClient, useTape } from 'zss/gadget/data/state'
import { compileast } from 'zss/lang/ast'
import * as lexer from 'zss/lang/lexer'
import { createlineindexes } from 'zss/lang/transformer'
import { CodeNode, NODE } from 'zss/lang/visitor'
import { isarray, isnumber, ispresent } from 'zss/mapping/types'
import { TapeBackPlate } from 'zss/screens/tape/backplate'
import { findcursorinrows, splitcoderows } from 'zss/screens/tape/common'
import { useShallow } from 'zustand/react/shallow'

import {
  ZSS_MUSIC_DRUM,
  ZSS_MUSIC_NOTE,
  ZSS_MUSIC_OCTAVE,
  ZSS_MUSIC_PITCH,
  ZSS_MUSIC_REST,
  ZSS_MUSIC_TIME,
  ZSS_MUSIC_TIMEMOD,
  ZSS_TYPE_COMMAND,
  ZSS_TYPE_SYMBOL,
  ZSS_WORD_COLOR,
  ZSS_WORD_DIR,
  ZSS_WORD_DIRMOD,
  ZSS_WORD_EXPRS,
  ZSS_WORD_FLAG,
  ZSS_WORD_KIND,
  ZSS_WORD_KIND_ALT,
  ZSS_WORD_STAT,
  zssmusiccolorconfig,
  zsswordcolorconfig,
} from './colors'
import { EditorFrame } from './editorframe'
import { EditorInput, EditorInputProps } from './editorinput'
import { EditorRows, EditorRowsProps } from './editorrows'

function skipwords(word: string) {
  switch (word) {
    // skip non-typed keywords
    case 'stat':
    case 'text':
    case 'hyperlink':
      return false
    default:
      return true
  }
}

// set #play note colors
zssmusiccolorconfig('a', ZSS_MUSIC_NOTE)
zssmusiccolorconfig('b', ZSS_MUSIC_NOTE)
zssmusiccolorconfig('c', ZSS_MUSIC_NOTE)
zssmusiccolorconfig('d', ZSS_MUSIC_NOTE)
zssmusiccolorconfig('e', ZSS_MUSIC_NOTE)
zssmusiccolorconfig('f', ZSS_MUSIC_NOTE)
zssmusiccolorconfig('g', ZSS_MUSIC_NOTE)
zssmusiccolorconfig('x', ZSS_MUSIC_REST)
zssmusiccolorconfig('#', ZSS_MUSIC_PITCH)
zssmusiccolorconfig('!', ZSS_MUSIC_PITCH)
zssmusiccolorconfig('y', ZSS_MUSIC_TIME)
zssmusiccolorconfig('t', ZSS_MUSIC_TIME)
zssmusiccolorconfig('s', ZSS_MUSIC_TIME)
zssmusiccolorconfig('i', ZSS_MUSIC_TIME)
zssmusiccolorconfig('q', ZSS_MUSIC_TIME)
zssmusiccolorconfig('h', ZSS_MUSIC_TIME)
zssmusiccolorconfig('w', ZSS_MUSIC_TIME)
zssmusiccolorconfig('3', ZSS_MUSIC_TIMEMOD)
zssmusiccolorconfig('.', ZSS_MUSIC_TIMEMOD)
zssmusiccolorconfig('+', ZSS_MUSIC_OCTAVE)
zssmusiccolorconfig('-', ZSS_MUSIC_OCTAVE)
zssmusiccolorconfig('0', ZSS_MUSIC_DRUM)
zssmusiccolorconfig('1', ZSS_MUSIC_DRUM)
zssmusiccolorconfig('2', ZSS_MUSIC_DRUM)
zssmusiccolorconfig('p', ZSS_MUSIC_DRUM)
zssmusiccolorconfig('4', ZSS_MUSIC_DRUM)
zssmusiccolorconfig('5', ZSS_MUSIC_DRUM)
zssmusiccolorconfig('6', ZSS_MUSIC_DRUM)
zssmusiccolorconfig('7', ZSS_MUSIC_DRUM)
zssmusiccolorconfig('8', ZSS_MUSIC_DRUM)
zssmusiccolorconfig('9', ZSS_MUSIC_DRUM)
zssmusiccolorconfig(';', ZSS_TYPE_SYMBOL)

export function EditorComponent() {
  const player = registerreadplayer()
  const [editor] = useTape(useShallow((state) => [state.editor]))

  const [
    wordscli,
    wordsloader,
    wordsruntime,
    wordsflags,
    wordsstats,
    wordskinds,
    wordsaltkinds,
    wordscolors,
    wordsdirs,
    wordsdirmods,
    wordsexprs,
  ] = useGadgetClient(
    useShallow((state) => [
      state.zsswords.cli,
      state.zsswords.loader,
      state.zsswords.runtime,
      state.zsswords.flags,
      state.zsswords.stats,
      state.zsswords.kinds,
      state.zsswords.altkinds,
      state.zsswords.colors,
      state.zsswords.dirs,
      state.zsswords.dirmods,
      state.zsswords.exprs,
    ]),
  )

  useEffect(() => {
    // set command keywords
    wordscli
      .filter(skipwords)
      .forEach((word) => zsswordcolorconfig(word, ZSS_TYPE_COMMAND))
    wordsloader
      .filter(skipwords)
      .forEach((word) => zsswordcolorconfig(word, ZSS_TYPE_COMMAND))
    wordsruntime
      .filter(skipwords)
      .forEach((word) => zsswordcolorconfig(word, ZSS_TYPE_COMMAND))

    // enum const words
    wordsflags.forEach((word) => zsswordcolorconfig(word, ZSS_WORD_FLAG))
    wordsstats.forEach((word) => zsswordcolorconfig(word, ZSS_WORD_STAT))
    wordskinds.forEach((word) => zsswordcolorconfig(word, ZSS_WORD_KIND))
    wordsaltkinds.forEach((word) => zsswordcolorconfig(word, ZSS_WORD_KIND_ALT))
    wordscolors.forEach((word) => zsswordcolorconfig(word, ZSS_WORD_COLOR))
    wordsdirs.forEach((word) => zsswordcolorconfig(word, ZSS_WORD_DIR))
    wordsdirmods.forEach((word) => zsswordcolorconfig(word, ZSS_WORD_DIRMOD))
    wordsexprs.forEach((word) => zsswordcolorconfig(word, ZSS_WORD_EXPRS))
  }, [
    wordscli,
    wordsloader,
    wordsruntime,
    wordsflags,
    wordsstats,
    wordskinds,
    wordsaltkinds,
    wordscolors,
    wordsdirs,
    wordsdirmods,
    wordsexprs,
  ])

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

  // split by line
  const rows = splitcoderows(strvalue)

  // cursor placement
  const ycursor = findcursorinrows(tapeeditor.cursor, rows)
  const xcursor = tapeeditor.cursor - rows[ycursor].start

  // tokenize code
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
        // iterate through node props, looking for an array of elements
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

  // measure edges once
  const props: EditorRowsProps | EditorInputProps = {
    rows,
    xcursor,
    ycursor,
    codepage,
    xoffset: -4 + tapeeditor.xscroll,
    yoffset: tapeeditor.yscroll,
  }

  return (
    <>
      <TapeBackPlate bump />
      <EditorFrame />
      <EditorRows {...props} />
      <EditorInput {...props} />
    </>
  )
}
