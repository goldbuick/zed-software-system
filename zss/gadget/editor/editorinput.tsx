import { useCallback, useEffect, useMemo, useRef } from 'react'
import {
  api_error,
  api_log,
  register_editor_close,
  register_t9wordsflag,
  register_terminal_close,
  register_terminal_inclayout,
  vm_cli,
  vm_copyjsonfile,
  vm_refscroll,
} from 'zss/device/api'
import { Y } from 'zss/device/modem'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { withclipboard } from 'zss/feature/keyboard'
import { checkforword } from 'zss/feature/t9'
import { useTape, useTapeEditor } from 'zss/gadget/data/state'
import { clamp } from 'zss/mapping/number'
import { MAYBE, ispresent, isstring } from 'zss/mapping/types'
import { ismac } from 'zss/words/system'
import {
  applycolortoindexes,
  applystrtoindex,
  textformatreadedges,
} from 'zss/words/textformat'
import { COLOR, NAME, PT } from 'zss/words/types'

import { useBlink, useDeviceConfig, useWriteText } from '../hooks'
import { Scrollable } from '../scrollable'
import { EDITOR_CODE_ROW } from '../tape/common'
import { UserInput, modsfromevent } from '../userinput'

export type EditorInputProps = {
  xcursor: number
  ycursor: number
  xoffset: number
  yoffset: number
  rows: EDITOR_CODE_ROW[]
  codepage: MAYBE<Y.Text>
}

export function EditorInput({
  xcursor,
  ycursor,
  xoffset,
  yoffset,
  rows,
  codepage,
}: EditorInputProps) {
  const blink = useBlink()
  const context = useWriteText()
  const tapeeditor = useTapeEditor()
  const player = registerreadplayer()
  const blinkdelta = useRef<PT>(undefined)
  const edge = textformatreadedges(context)
  const editorpath = useTape((state) => state.editor.path)

  // split by line
  const strvalue = ispresent(codepage) ? codepage.toJSON() : ''
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
        const atchar = x + y * context.width
        applystrtoindex(atchar, String.fromCharCode(221), context)
        applycolortoindexes(atchar, atchar, COLOR.WHITE, COLOR.DKBLUE, context)
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
  const strvalueselected = hasselection ? strvalue.substring(ii1, ii2 + 1) : ''

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
      codepage?.delete(index, count)
    }
    if (ispresent(insert)) {
      codepage?.insert(index, insert)
    }
    useTapeEditor.setState({
      cursor: index + (insert ?? '').length,
      select: undefined,
    })
  }

  function strtogglecomments() {
    if (hasselection) {
      const lines = strvalueselected.split('\n')
      for (let l = 0; l < lines.length; ++l) {
        const line = lines[l]
        const tline = line.trim()
        if (tline.startsWith(`'`)) {
          lines[l] = line.replace(/' ?/, '')
        } else if (tline) {
          lines[l] = `' ${line}`
        }
      }
      strvaluesplice(ii1, iic, lines.join('\n'))
    } else {
      // toggle single line
    }
  }

  function deleteselection() {
    if (hasselection) {
      useTapeEditor.setState({ cursor: ii1 })
      strvaluesplice(ii1, iic)
    }
  }

  function resettoend() {
    useTapeEditor.setState({ cursor: codeend, select: undefined })
  }

  // eval for t9 / alt keys
  if (useDeviceConfig.getState().wordlistflag !== 'typing') {
    const maybechar = checkforword(strvalue, tapeeditor.cursor, player)
    if (isstring(maybechar) && maybechar) {
      strvaluesplice(tapeeditor.cursor - 2, 2, maybechar)
    }
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

  useEffect(() => {
    if (useDeviceConfig.getState().wordlistflag !== 'typing') {
      register_t9wordsflag(SOFTWARE, player, `${xcursor}${ycursor}`)
    }
  }, [player, xcursor, ycursor])

  const undomanager = useMemo(() => {
    return codepage ? new Y.UndoManager(codepage) : undefined
  }, [codepage])

  useEffect(() => {
    function handleadded(arg0: any) {
      arg0.stackItem.meta.set('cursor', tapeeditor.cursor)
    }
    function handlepopped(arg0: any) {
      if (arg0.stackItem.meta.has('cursor')) {
        const cursor = arg0.stackItem.meta.get('cursor')
        useTapeEditor.setState({ cursor })
      }
    }
    undomanager?.on('stack-item-added', handleadded)
    undomanager?.on('stack-item-popped', handlepopped)
    return () => {
      undomanager?.off('stack-item-added', handleadded)
      undomanager?.off('stack-item-popped', handlepopped)
    }
  }, [undomanager, tapeeditor.cursor])

  return (
    <>
      <Scrollable
        blocking
        x={edge.left}
        y={edge.top}
        width={edge.width}
        height={edge.height}
        onScroll={(ydelta: number) => movecursor(ydelta * 0.75)}
      />
      <UserInput
        keydown={(event) => {
          if (!ispresent(codepage)) {
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
              if (ispresent(codepage)) {
                // insert newline !
                codepage.insert(tapeeditor.cursor, `\n`)
                useTapeEditor.setState({ cursor: tapeeditor.cursor + 1 })
              }
              break
            case 'esc':
            case 'escape':
              if (mods.shift || mods.alt || mods.ctrl) {
                register_terminal_close(SOFTWARE, player)
              } else {
                register_editor_close(SOFTWARE, player)
              }
              break
            case 'tab':
              register_terminal_inclayout(SOFTWARE, player, !mods.shift)
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
                  case 'e':
                    vm_copyjsonfile(SOFTWARE, player, editorpath)
                    break
                  case 'k':
                    // open ref scroll instead
                    vm_refscroll(SOFTWARE, player)
                    break
                  case 'z':
                    if (ismac && mods.shift) {
                      undomanager?.redo()
                    } else {
                      undomanager?.undo()
                    }
                    break
                  case 'y':
                    if (!ismac) {
                      undomanager?.redo()
                    }
                    break
                  case 'a':
                    useTapeEditor.setState({ cursor: codeend, select: 0 })
                    break
                  case 'c':
                    if (ispresent(withclipboard())) {
                      withclipboard()
                        .writeText(strvalueselected)
                        .catch((err) =>
                          api_error(SOFTWARE, player, 'clipboard', err),
                        )
                    } else {
                      resettoend()
                    }
                    break
                  case 'v':
                    if (ispresent(withclipboard())) {
                      withclipboard()
                        .readText()
                        .then((text) => {
                          const cleantext = text.replaceAll('\r', '')
                          if (hasselection) {
                            strvaluesplice(ii1, iic, cleantext)
                          } else {
                            strvaluesplice(tapeeditor.cursor, 0, cleantext)
                          }
                        })
                        .catch((err) =>
                          api_error(SOFTWARE, player, 'clipboard', err),
                        )
                    } else {
                      resettoend()
                    }
                    break
                  case 'x':
                    if (ispresent(withclipboard())) {
                      withclipboard()
                        .writeText(strvalueselected)
                        .then(() => deleteselection())
                        .catch((err) =>
                          api_error(SOFTWARE, player, 'clipboard', err),
                        )
                    } else {
                      resettoend()
                    }
                    break
                  case 'p':
                    vm_cli(SOFTWARE, player, strvalueselected)
                    api_log(
                      SOFTWARE,
                      player,
                      `running $WHITE${strvalueselected.substring(0, 16)}...$BLUE`,
                    )
                    break
                  case `'`:
                    strtogglecomments()
                    break
                }
              } else if (mods.alt) {
                // no-op ?? - could this shove text around when you have selection ??
                // or jump by 10 or by word ??
              } else if (key.length === 1) {
                if (hasselection) {
                  if (key === `'`) {
                    strtogglecomments()
                  } else {
                    strvaluesplice(ii1, iic, key)
                  }
                } else {
                  const cursor = tapeeditor.cursor + key.length
                  codepage.insert(tapeeditor.cursor, key)
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
