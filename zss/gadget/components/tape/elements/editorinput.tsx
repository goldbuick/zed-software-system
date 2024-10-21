import { useCallback, useEffect, useRef } from 'react'
import {
  api_error,
  tape_editor_close,
  tape_terminal_close,
  tape_terminal_inclayout,
} from 'zss/device/api'
import { MODEM_SHARED_STRING } from 'zss/device/modem'
import { PT } from 'zss/firmware/wordtypes'
import {
  applystrtoindex,
  textformatreadedges,
  useWriteText,
} from 'zss/gadget/data/textformat'
import { clamp } from 'zss/mapping/number'
import { MAYBE, ispresent } from 'zss/mapping/types'

import { Scrollable } from '../../scrollable'
import { useBlink } from '../../useblink'
import { UserInput, modsfromevent } from '../../userinput'
import {
  EDITOR_CODE_ROW,
  sharedtosynced,
  tapeeditorstate,
  useTapeEditor,
} from '../common'

type TextinputProps = {
  ycursor: number
  yoffset: number
  rows: EDITOR_CODE_ROW[]
  codepage: MAYBE<MODEM_SHARED_STRING>
}

export function EditorInput({
  ycursor,
  yoffset,
  rows,
  codepage,
}: TextinputProps) {
  const blink = useBlink()
  const context = useWriteText()
  const blinkdelta = useRef<PT>()
  const tapeeditor = useTapeEditor()
  const edge = textformatreadedges(context)

  // split by line
  const value = sharedtosynced(codepage)
  const strvalue = ispresent(value) ? value.toJSON() : ''
  const rowsend = rows.length - 1

  // translate index to x, y
  const xcursor = tapeeditor.cursor - rows[ycursor].start

  // draw cursor
  const xblink = xcursor + 1
  const yblink = ycursor + 2 - yoffset
  if (ispresent(codepage)) {
    const moving =
      blinkdelta.current?.x !== xblink || blinkdelta.current?.y !== yblink
    if (blink || moving) {
      const x = edge.left + xblink
      const y = edge.top + yblink
      applystrtoindex(x + y * context.width, String.fromCharCode(221), context)
    }
  }
  blinkdelta.current = { x: xblink, y: yblink }

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

  const movecursor = useCallback(
    function movecursor(inc: number) {
      const ycheck = Math.round(ycursor + inc)
      if (ycheck < 0) {
        tapeeditorstate.cursor = 0
      } else if (ycheck > rowsend) {
        tapeeditorstate.cursor = codeend
      } else {
        const row = rows[ycheck]
        tapeeditorstate.cursor =
          row.start + Math.min(xcursor, row.code.length - 1)
      }
    },
    [codeend, rows, rowsend, xcursor, ycursor],
  )

  const maxscroll = rows.length - 4
  useEffect(() => {
    const delta = ycursor - tapeeditor.scroll
    if (delta > edge.height - 8) {
      tapeeditorstate.scroll++
    }
    if (delta < 4) {
      tapeeditorstate.scroll--
    }
    tapeeditorstate.scroll = Math.round(
      clamp(tapeeditorstate.scroll, 0, maxscroll),
    )
  }, [ycursor, tapeeditor.scroll, maxscroll, edge.height])

  return (
    <>
      <Scrollable
        blocking
        x={edge.left}
        y={edge.top}
        width={edge.width}
        height={edge.height}
        onScroll={(ydelta) => movecursor(ydelta * 0.75)}
      />
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
            movecursor(mods.alt ? -10 : -1)
          }
        }}
        MOVE_DOWN={(mods) => {
          trackselection(mods.shift)
          if (mods.ctrl) {
            tapeeditorstate.cursor = codeend
          } else {
            movecursor(mods.alt ? 10 : 1)
          }
        }}
        OK_BUTTON={() => {
          if (ispresent(value)) {
            // insert newline !
            value.insert(tapeeditor.cursor, `\n`)
            tapeeditorstate.cursor += 1
          }
        }}
        CANCEL_BUTTON={(mods) => {
          if (mods.shift || mods.alt || mods.ctrl) {
            tape_terminal_close('tape')
          } else {
            tape_editor_close('editor')
          }
        }}
        MENU_BUTTON={(mods) => {
          tape_terminal_inclayout('editor', !mods.shift)
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
                          const cleantext = text.replaceAll('\r', '')
                          if (hasselection) {
                            strvaluesplice(ii1, iic, cleantext)
                          } else {
                            strvaluesplice(tapeeditor.cursor, 0, cleantext)
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
    </>
  )
}
