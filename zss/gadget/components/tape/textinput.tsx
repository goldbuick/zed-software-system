import { useContext } from 'react'
import { useSnapshot } from 'valtio'
import { tape_terminal_inclayout } from 'zss/device/api'
import { WriteTextContext, applystrtoindex } from 'zss/gadget/data/textformat'
import { clamp } from 'zss/mapping/number'

import { useBlink } from '../useblink'
import { UserInput, modsfromevent } from '../userinput'

import { tapeeditorstate } from './common'

export function Textinput() {
  const blink = useBlink()
  const context = useContext(WriteTextContext)
  const tapeeditor = useSnapshot(tapeeditorstate)

  // draw cursor
  if (blink) {
    const x = tapeeditor.xcursor + 1
    const y = tapeeditor.ycursor + 2
    applystrtoindex(x + y * context.width, String.fromCharCode(221), context)
  }

  const RIGHT_EDGE = 80

  return (
    <UserInput
      MOVE_LEFT={(mods) => {
        if (mods.ctrl) {
          //
        } else {
          // mods.shift - track selection
          tapeeditorstate.xcursor = clamp(
            tapeeditorstate.xcursor - (mods.alt ? 10 : 1),
            0,
            RIGHT_EDGE,
          )
        }
      }}
      MOVE_RIGHT={(mods) => {
        if (mods.ctrl) {
          //
        } else {
          // mods.shift - track selection
          tapeeditorstate.xcursor = clamp(
            tapeeditorstate.xcursor + (mods.alt ? 10 : 1),
            0,
            RIGHT_EDGE,
          )
        }
      }}
      MOVE_UP={(mods) => {
        if (mods.ctrl) {
          //
        } else {
          // mods.shift - track selection
          // (mods.alt ? 10 : 1)
        }
      }}
      MOVE_DOWN={(mods) => {
        if (mods.ctrl) {
          //
        } else {
          // mods.shift - track selection
          // (mods.alt ? 10 : 1)
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
        console.info(mods, event.key)
      }}
    />
  )
}
