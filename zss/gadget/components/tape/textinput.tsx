import { SyncedText } from '@syncedstore/core'
import { useSnapshot } from 'valtio'
import { tape_info, tape_terminal_inclayout } from 'zss/device/api'
import { useWaitForString } from 'zss/device/modem'
import { useTape } from 'zss/device/tape'
import { applystrtoindex, useWriteText } from 'zss/gadget/data/textformat'
import { clamp } from 'zss/mapping/number'

import { useBlink } from '../useblink'
import { UserInput, modsfromevent } from '../userinput'

import { tapeeditorstate } from './common'

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
    cursor += code.length
    return {
      start,
      code,
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
  return -1
}

export function Textinput() {
  const tape = useTape()
  const blink = useBlink()
  const context = useWriteText()
  const tapeeditor = useSnapshot(tapeeditorstate)
  const codepage = useWaitForString(tape.editor.page)

  // split by line
  const code = codepage ? (codepage.value as SyncedText).toJSON() : ''
  const rows = splitcoderows(code)

  // translate index to x, y
  const ycursor = findcursorinrows(tapeeditor.cursor, rows)
  const xcursor = tapeeditor.cursor - rows[ycursor].start

  // draw cursor
  if (blink) {
    const x = xcursor + 1
    const y = ycursor + 2
    applystrtoindex(x + y * context.width, String.fromCharCode(221), context)
  }

  // ranges
  const codeend = code.length - 1
  const coderow = rows[ycursor]?.code ?? ''
  const coderowlength = coderow.length

  return (
    <UserInput
      MOVE_LEFT={(mods) => {
        if (mods.ctrl) {
          //
        } else {
          // mods.shift - track selection
          tapeeditorstate.cursor = clamp(
            tapeeditorstate.cursor - (mods.alt ? 10 : 1),
            0,
            codeend,
          )
        }
      }}
      MOVE_RIGHT={(mods) => {
        if (mods.ctrl) {
          //
        } else {
          // mods.shift - track selection
          tapeeditorstate.cursor = clamp(
            tapeeditorstate.cursor + (mods.alt ? 10 : 1),
            0,
            codeend,
          )
        }
      }}
      MOVE_UP={(mods) => {
        if (mods.ctrl) {
          //
        } else {
          // mods.shift - track selection
          // (mods.alt ? 10 : 1)
          const ycheck = clamp(ycursor - (mods.alt ? 10 : 1), 0, codeend)
          tapeeditorstate.cursor = rows[ycheck].start + xcursor
        }
      }}
      MOVE_DOWN={(mods) => {
        if (mods.ctrl) {
          //
        } else {
          // mods.shift - track selection
          // (mods.alt ? 10 : 1)
          const ycheck = clamp(ycursor + (mods.alt ? 10 : 1), 0, codeend)
          tapeeditorstate.cursor = rows[ycheck].start + xcursor
        }
      }}
      OK_BUTTON={() => {
        //
      }}
      CANCEL_BUTTON={() => {
        //
      }}
      MENU_BUTTON={(mods) => {
        tape_terminal_inclayout('tape', mods.shift ? -1 : 1)
      }}
      keydown={(event) => {
        const mods = modsfromevent(event)
        tape_info('eti', mods, event.key)
      }}
    />
  )
}
