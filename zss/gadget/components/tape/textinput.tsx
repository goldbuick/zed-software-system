import { useRef } from 'react'
import {
  api_error,
  tape_editor_close,
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
  const codepage = useWaitForString(
    tape.editor.book,
    tape.editor.page,
    tape.editor.player,
  )

  // split by line
  const value = sharedtosynced(codepage)
  const strvalue = ispresent(value) ? value.toJSON() : ''
  const rows = splitcoderows(strvalue)
  const rowsend = rows.length - 1

  // translate index to x, y
  const ycursor = findcursorinrows(tapeeditor.cursor, rows)
  const xcursor = tapeeditor.cursor - rows[ycursor].start

  // draw cursor
  const xblink = xcursor + 1
  const yblink = ycursor + 2
  if (
    ispresent(codepage) &&
    (blink ||
      blinkdelta.current?.x !== xblink ||
      blinkdelta.current?.y !== yblink)
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
  const coderow = rows[ycursor]

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

  const iic = ii2 - ii1 + 1
  const strvalueselected = hasselection
    ? strvalue.substring(ii1, ii2 + 1)
    : strvalue

  function trackselection(active: boolean) {
    if (active) {
      if (!ispresent(tapeeditor.select)) {
        tapeeditorstate.select = tapeeditor.cursor
      }
    } else {
      tapeeditorstate.select = undefined
    }
  }

  function strvaluesplice(index: number, count: number, insert?: string) {
    if (count > 0) {
      value?.delete(index, count)
    }
    if (ispresent(insert)) {
      value?.insert(index, insert)
    }
    tapeeditorstate.cursor = index + (insert ?? '').length
    tapeeditorstate.select = undefined
  }

  function deleteselection() {
    if (ispresent(tapeeditor.select)) {
      tapeeditorstate.cursor = ii1
      strvaluesplice(ii1, iic)
    }
  }

  function resettoend() {
    tapeeditorstate.cursor = codeend
    tapeeditorstate.select = undefined
  }

  return (
    <UserInput
      MOVE_LEFT={(mods) => {
        trackselection(mods.shift)
        if (mods.ctrl) {
          tapeeditorstate.cursor = coderow.start
        } else {
          const cursor = tapeeditorstate.cursor - (mods.alt ? 10 : 1)
          tapeeditorstate.cursor = clamp(cursor, 0, codeend)
        }
      }}
      MOVE_RIGHT={(mods) => {
        trackselection(mods.shift)
        if (mods.ctrl) {
          tapeeditorstate.cursor = coderow.end
        } else {
          const cursor = tapeeditorstate.cursor + (mods.alt ? 10 : 1)
          tapeeditorstate.cursor = clamp(cursor, 0, codeend)
        }
      }}
      MOVE_UP={(mods) => {
        trackselection(mods.shift)
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
            tapeeditorstate.cursor =
              row.start + Math.min(xcursor, row.code.length - 1)
          }
        }
      }}
      MOVE_DOWN={(mods) => {
        trackselection(mods.shift)
        if (mods.ctrl) {
          tapeeditorstate.cursor = codeend
        } else {
          const ycheck = ycursor + (mods.alt ? 10 : 1)
          if (ycheck < 0) {
            tapeeditorstate.cursor = 0
          } else if (ycheck > rowsend) {
            tapeeditorstate.cursor = codeend
          } else {
            const row = rows[ycheck]
            tapeeditorstate.cursor =
              row.start + Math.min(xcursor, row.code.length - 1)
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
        tape_terminal_inclayout('editor', mods.shift ? -1 : 1)
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
            if (hasselection) {
              deleteselection()
            } else {
              value.delete(tapeeditor.cursor, 1)
            }
            break
          case 'backspace':
            if (hasselection) {
              deleteselection()
            } else {
              tapeeditorstate.cursor = Math.max(0, tapeeditorstate.cursor - 1)
              value.delete(tapeeditorstate.cursor, 1)
            }
            break
          default:
            if (mods.ctrl) {
              switch (lkey) {
                case 'a':
                  tapeeditorstate.select = 0
                  tapeeditorstate.cursor = codeend
                  break
                case 'c':
                  if (ispresent(navigator.clipboard)) {
                    navigator.clipboard
                      .writeText(strvalueselected)
                      .catch((err) => api_error('tape', 'clipboard', err))
                  } else {
                    resettoend()
                  }
                  break
                case 'v':
                  if (ispresent(navigator.clipboard)) {
                    navigator.clipboard
                      .readText()
                      .then((text) => {
                        if (hasselection) {
                          strvaluesplice(ii1, iic, text)
                        } else {
                          strvaluesplice(tapeeditor.cursor, 0, text)
                        }
                      })
                      .catch((err) => api_error('tape', 'clipboard', err))
                  } else {
                    resettoend()
                  }
                  break
                case 'x':
                  if (ispresent(navigator.clipboard)) {
                    navigator.clipboard
                      .writeText(strvalueselected)
                      .then(() => deleteselection())
                      .catch((err) => api_error('tape', 'clipboard', err))
                  } else {
                    resettoend()
                  }
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
