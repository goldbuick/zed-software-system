import { SyncedText } from '@syncedstore/core'
import { useRef } from 'react'
import {
  tape_editor_close,
  tape_info,
  tape_terminal_inclayout,
} from 'zss/device/api'
import { useWaitForString } from 'zss/device/modem'
import { useTape } from 'zss/device/tape'
import { PT } from 'zss/firmware/wordtypes'
import { applystrtoindex, useWriteText } from 'zss/gadget/data/textformat'
import { clamp } from 'zss/mapping/number'
import { ispresent } from 'zss/mapping/types'

import { useBlink } from '../useblink'
import { UserInput, modsfromevent } from '../userinput'

import { tapeeditorstate, useTapeEditor } from './common'

type CODE_ROW = {
  start: number
  code: string
  end: number
}

function splitcoderows(code: string): CODE_ROW[] {
  let cursor = 0
  const rows = code.split(/\r?\n/)
  return rows.map((code) => {
    const start = cursor
    const fullcode = `${code}\n`
    cursor += fullcode.length
    return {
      start,
      code: fullcode,
      end: start + code.length,
    }
  })
}

function findcursorinrows(cursor: number, rows: CODE_ROW[]) {
  for (let i = 0; i < rows.length; ++i) {
    if (cursor < rows[i].end) {
      return i
    }
  }
  return 0
}

export function Textinput() {
  const tape = useTape()
  const blink = useBlink()
  const context = useWriteText()
  const blinkdelta = useRef<PT>()
  const tapeeditor = useTapeEditor()
  const codepage = useWaitForString(tape.editor.page)

  // split by line
  const value = codepage ? (codepage.value as SyncedText) : undefined
  const code = value ? value.toJSON() : ''
  const rows = splitcoderows(code)
  const rowsend = rows.length - 1

  // translate index to x, y
  const ycursor = findcursorinrows(tapeeditor.cursor, rows)
  const xcursor = tapeeditor.cursor - rows[ycursor].start

  console.info(tapeeditor.cursor, xcursor, ycursor, rows)

  // draw cursor
  const xblink = xcursor + 1
  const yblink = ycursor + 2
  if (
    blink ||
    blinkdelta.current?.x !== xblink ||
    blinkdelta.current?.y !== yblink
  ) {
    blinkdelta.current = { x: xblink, y: yblink }
    applystrtoindex(
      xblink + yblink * context.width,
      String.fromCharCode(221),
      context,
    )
  }

  // ranges
  const codeend = code.length - 1
  // const coderow = rows[ycursor]?.code ?? ''
  // const coderowend = coderow.length - 1

  return (
    <UserInput
      MOVE_LEFT={(mods) => {
        if (mods.ctrl) {
          const yoffset = findcursorinrows(ycursor, rows)
          tapeeditorstate.cursor = rows[yoffset].start
        } else {
          tapeeditorstate.cursor = clamp(
            tapeeditorstate.cursor - (mods.alt ? 10 : 1),
            0,
            codeend,
          )
        }
      }}
      MOVE_RIGHT={(mods) => {
        if (mods.ctrl) {
          const yoffset = findcursorinrows(ycursor, rows)
          tapeeditorstate.cursor = rows[yoffset].end
        } else {
          tapeeditorstate.cursor = clamp(
            tapeeditorstate.cursor + (mods.alt ? 10 : 1),
            0,
            codeend,
          )
        }
      }}
      MOVE_UP={(mods) => {
        if (mods.ctrl) {
          tapeeditorstate.cursor = 0
        } else {
          const ycheck = ycursor - (mods.alt ? 10 : 1)
          if (ycheck < 0) {
            tapeeditorstate.cursor = 0
          } else if (ycheck > rowsend) {
            tapeeditorstate.cursor = codeend
          } else {
            const yoffset = findcursorinrows(ycheck, rows)
            tapeeditorstate.cursor = rows[yoffset].start + xcursor
          }
        }
      }}
      MOVE_DOWN={(mods) => {
        if (mods.ctrl) {
          tapeeditorstate.cursor = codeend
        } else {
          const ycheck = ycursor + (mods.alt ? 10 : 1)
          if (ycheck < 0) {
            tapeeditorstate.cursor = 0
          } else if (ycheck > rowsend) {
            tapeeditorstate.cursor = codeend
          } else {
            const yoffset = findcursorinrows(ycheck, rows)
            tapeeditorstate.cursor = rows[yoffset].start + xcursor
          }
        }
      }}
      OK_BUTTON={() => {
        if (ispresent(value)) {
          // insert newline !
          value.insert(tapeeditor.cursor, `\n`)
          tapeeditorstate.cursor += 1
        }
      }}
      CANCEL_BUTTON={() => {
        tape_editor_close('editor')
      }}
      MENU_BUTTON={(mods) => {
        tape_terminal_inclayout('tape', mods.shift ? -1 : 1)
      }}
      keydown={(event) => {
        if (!ispresent(value)) {
          return
        }

        const { key } = event
        const lkey = key.toLowerCase()
        const mods = modsfromevent(event)

        switch (lkey) {
          case 'delete':
            value.delete(tapeeditor.cursor, 1)
            break
          case 'backspace':
            value.delete(tapeeditor.cursor - 1, 1)
            break
          default:
            if (mods.ctrl) {
              switch (lkey) {
                case 'a':
                  break
                case 'c':
                  break
                case 'v':
                  break
                case 'x':
                  break
              }
            } else if (mods.alt) {
              // no-op ?? - could this shove text around when you have selection ??
              // or jump by 10 or by word ??
            } else if (key.length === 1) {
              value.insert(tapeeditor.cursor, key)
              tapeeditorstate.cursor += key.length
            }
            break
        }
      }}
    />
  )
}
