import { useRef } from 'react'
import { tape_editor_close, tape_terminal_inclayout } from 'zss/device/api'
import { useWaitForString } from 'zss/device/modem'
import { useTape } from 'zss/device/tape'
import { PT } from 'zss/firmware/wordtypes'
import { applystrtoindex, useWriteText } from 'zss/gadget/data/textformat'
import { clamp } from 'zss/mapping/number'
import { ispresent } from 'zss/mapping/types'

import { useBlink } from '../useblink'
import { UserInput, modsfromevent } from '../userinput'

import {
  findcursorinrows,
  sharedtosynced,
  splitcoderows,
  tapeeditorstate,
  useTapeEditor,
} from './common'

export function Textinput() {
  const tape = useTape()
  const blink = useBlink()
  const context = useWriteText()
  const blinkdelta = useRef<PT>()
  const tapeeditor = useTapeEditor()
  const codepage = useWaitForString(tape.editor.page)

  // split by line
  const value = sharedtosynced(codepage)
  const rows = splitcoderows(ispresent(value) ? value.toJSON() : '')
  const rowsend = rows.length - 1

  // translate index to x, y
  const ycursor = findcursorinrows(tapeeditor.cursor, rows)
  const xcursor = tapeeditor.cursor - rows[ycursor].start

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
  const codeend = rows[rowsend].end
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
            const row = rows[ycheck]
            tapeeditorstate.cursor = row.start + clamp(xcursor, 0, row.end)
          }
        }
      }}
      MOVE_DOWN={(mods) => {
        if (mods.ctrl) {
          tapeeditorstate.cursor = codeend
        } else {
          const ycheck = ycursor + (mods.alt ? 10 : 1)
          console.info({ xcursor, ycursor, ycheck, rowsend })
          if (ycheck < 0) {
            tapeeditorstate.cursor = 0
          } else if (ycheck > rowsend) {
            tapeeditorstate.cursor = codeend
          } else {
            const row = rows[ycheck]
            tapeeditorstate.cursor = row.start + clamp(xcursor, 0, row.end)
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
