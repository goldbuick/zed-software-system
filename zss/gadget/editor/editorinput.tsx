import { useCallback, useRef } from 'react'
import {
  api_error,
  tape_editor_close,
  tape_terminal_close,
  tape_terminal_inclayout,
  vm_cli,
} from 'zss/device/api'
import { MODEM_SHARED_STRING } from 'zss/device/modem'
import { useTape, useTapeEditor } from 'zss/gadget/data/state'
import { clamp } from 'zss/mapping/number'
import { MAYBE, ispresent } from 'zss/mapping/types'
import { applystrtoindex, textformatreadedges } from 'zss/words/textformat'
import { NAME, PT } from 'zss/words/types'
import { writetext } from 'zss/words/writeui'

import { useBlink, useWriteText } from '../hooks'
import { Scrollable } from '../scrollable'
import { EDITOR_CODE_ROW, sharedtosynced } from '../tape/common'
import { UserInput, modsfromevent } from '../userinput'

type TextinputProps = {
  xcursor: number
  ycursor: number
  xoffset: number
  yoffset: number
  rows: EDITOR_CODE_ROW[]
  codepage: MAYBE<MODEM_SHARED_STRING>
}

export function EditorInput({
  xcursor,
  ycursor,
  xoffset,
  yoffset,
  rows,
  codepage,
}: TextinputProps) {
  const blink = useBlink()
  const context = useWriteText()
  const blinkdelta = useRef<PT>()
  const tapeeditor = useTapeEditor()
  const edge = textformatreadedges(context)
  const player = useTape((state) => state.editor.player)

  // split by line
  const value = sharedtosynced(codepage)
  const strvalue = ispresent(value) ? value.toJSON() : ''
  const rowsend = rows.length - 1

  // draw cursor
  const xblink = xcursor + 1 - xoffset
  const yblink = ycursor + 2 - yoffset
  if (ispresent(codepage)) {
    const moving =
      blinkdelta.current?.x !== xblink || blinkdelta.current?.y !== yblink
    if (blink || moving) {
      const x = edge.left + xblink
      const y = edge.top + yblink
      // visibility clip
      if (
        y > edge.top + 1 &&
        y < edge.bottom &&
        x > edge.left &&
        x < edge.right
      ) {
        applystrtoindex(
          x + y * context.width,
          String.fromCharCode(221),
          context,
        )
      }
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
        useTapeEditor.setState({ select: tapeeditor.cursor })
      }
    } else {
      // hopefully this works ?
      useTapeEditor.setState({ select: undefined })
    }
  }

  function strvaluesplice(index: number, count: number, insert?: string) {
    if (count > 0) {
      value?.delete(index, count)
    }
    if (ispresent(insert)) {
      value?.insert(index, insert)
    }
    useTapeEditor.setState({
      cursor: index + (insert ?? '').length,
      select: undefined,
    })
  }

  function deleteselection() {
    if (ispresent(tapeeditor.select)) {
      useTapeEditor.setState({ cursor: ii1 })
      strvaluesplice(ii1, iic)
    }
  }

  function resettoend() {
    useTapeEditor.setState({ cursor: codeend, select: undefined })
  }

  const movecursor = useCallback(
    function movecursor(inc: number) {
      const ycheck = Math.round(ycursor + inc)
      if (ycheck < 0) {
        useTapeEditor.setState({ cursor: 0 })
      } else if (ycheck > rowsend) {
        useTapeEditor.setState({ cursor: codeend })
      } else {
        const row = rows[ycheck]
        useTapeEditor.setState({
          cursor: row.start + Math.min(xcursor, row.code.length - 1),
        })
      }
    },
    [codeend, rows, rowsend, xcursor, ycursor],
  )

  context.changed()
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
        keydown={(event) => {
          if (!ispresent(value)) {
            return
          }

          const { key } = event
          const lkey = NAME(key)
          const mods = modsfromevent(event)

          switch (lkey) {
            case 'arrowleft':
              trackselection(mods.shift)
              if (mods.ctrl) {
                useTapeEditor.setState({ cursor: coderow.start })
              } else {
                const cursor = tapeeditor.cursor - (mods.alt ? 10 : 1)
                useTapeEditor.setState({ cursor: clamp(cursor, 0, codeend) })
              }
              break
            case 'arrowright':
              trackselection(mods.shift)
              if (mods.ctrl) {
                useTapeEditor.setState({ cursor: coderow.end })
              } else {
                const cursor = tapeeditor.cursor + (mods.alt ? 10 : 1)
                useTapeEditor.setState({ cursor: clamp(cursor, 0, codeend) })
              }
              break
            case 'arrowup':
              trackselection(mods.shift)
              if (mods.ctrl) {
                useTapeEditor.setState({ cursor: 0 })
              } else {
                movecursor(mods.alt ? -10 : -1)
              }
              break
            case 'arrowdown':
              trackselection(mods.shift)
              if (mods.ctrl) {
                useTapeEditor.setState({ cursor: codeend })
              } else {
                movecursor(mods.alt ? 10 : 1)
              }
              break
            case 'enter':
              if (ispresent(value)) {
                // insert newline !
                value.insert(tapeeditor.cursor, `\n`)
                useTapeEditor.setState({ cursor: tapeeditor.cursor + 1 })
              }
              break
            case 'esc':
            case 'escape':
              if (mods.shift || mods.alt || mods.ctrl) {
                tape_terminal_close('tape')
              } else {
                tape_editor_close('editor')
              }
              break
            case 'tab':
              tape_terminal_inclayout('editor', !mods.shift)
              break
            case 'delete':
              if (hasselection) {
                deleteselection()
              } else {
                strvaluesplice(tapeeditor.cursor, 1)
              }
              break
            case 'backspace':
              if (hasselection) {
                deleteselection()
              } else if (strvalue.length > 0) {
                strvaluesplice(Math.max(tapeeditor.cursor - 1, 0), 1)
              }
              break
            default:
              if (mods.ctrl) {
                switch (lkey) {
                  case 'a':
                    useTapeEditor.setState({ cursor: codeend, select: 0 })
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
                  case 'p':
                    vm_cli('editor', strvalueselected, player)
                    writetext('editor', `running: ${strvalueselected}`)
                    break
                }
              } else if (mods.alt) {
                // no-op ?? - could this shove text around when you have selection ??
                // or jump by 10 or by word ??
              } else if (key.length === 1) {
                if (hasselection) {
                  strvaluesplice(ii1, iic, key)
                } else {
                  const cursor = tapeeditor.cursor + key.length
                  value.insert(tapeeditor.cursor, key)
                  useTapeEditor.setState({
                    cursor,
                  })
                }
              }
              break
          }
        }}
      />
    </>
  )
}
