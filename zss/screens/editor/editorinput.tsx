import { useCallback, useEffect, useMemo, useRef } from 'react'
import {
  apierror,
  apilog,
  registereditorclose,
  registerterminalclose,
  registerterminalinclayout,
  vmcli,
} from 'zss/device/api'
import { Y } from 'zss/device/modem'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { withclipboard } from 'zss/feature/keyboard'
import { useEditor } from 'zss/gadget/data/state'
import { useBlink, useWriteText } from 'zss/gadget/hooks'
import { Scrollable } from 'zss/gadget/scrollable'
import { UserInput, modsfromevent } from 'zss/gadget/userinput'
import { clamp } from 'zss/mapping/number'
import { MAYBE, ispresent } from 'zss/mapping/types'
import {
  EDITOR_CODE_ROW,
  findcursorinrows,
  findmaxwidthinrows,
} from 'zss/screens/tape/common'
import { ismac } from 'zss/words/system'
import {
  applycolortoindexes,
  applystrtoindex,
  textformatreadedges,
} from 'zss/words/textformat'
import { COLOR, NAME, PT } from 'zss/words/types'

const CHUNK_STEP = 32

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
  const tapeeditor = useEditor()
  const player = registerreadplayer()
  const blinkdelta = useRef<PT>(undefined)
  const edge = textformatreadedges(context)

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
        useEditor.setState({ select: tapeeditor.cursor })
      }
    } else {
      // hopefully this works ?
      useEditor.setState({ select: undefined })
    }
  }

  const updatescrolling = useCallback(
    function (cursor: number) {
      useEditor.setState((state) => {
        // cursor placement
        const ycursor2 = findcursorinrows(cursor, rows)
        const xcursor2 = cursor - rows[ycursor2].start

        // deltas
        const xview = edge.width - 8
        const yview = edge.height - 4
        const xstep = Math.round(xview * 0.5)
        const ystep = Math.round(yview * 0.5)
        const hxstep = Math.round(xview * 0.25)
        const xdelta = Math.abs(xcursor2 - (state.xscroll + xstep))

        // panning scroll
        const xscroll = xdelta < hxstep ? state.xscroll : xcursor2 - xstep
        const yscroll = ycursor2 - ystep

        // figure out longest line of code
        const maxwidth = findmaxwidthinrows(rows)
        const xmaxscroll = (Math.round(maxwidth / CHUNK_STEP) + 1) * CHUNK_STEP
        const ymaxscroll = rows.length - yview

        return {
          xscroll: Math.round(clamp(xscroll, 0, xmaxscroll)),
          yscroll: Math.round(clamp(yscroll, 0, ymaxscroll)),
        }
      })
    },
    [rows, edge.width, edge.height],
  )

  const strvaluesplice = useCallback(
    function (index: number, count: number, insert?: string) {
      if (count > 0) {
        codepage?.delete(index, count)
      }
      if (ispresent(insert)) {
        codepage?.insert(index, insert)
      }
      const cursor = index + (insert ?? '').length
      updatescrolling(cursor)
      useEditor.setState({
        cursor,
        select: undefined,
      })
    },
    [codepage, updatescrolling],
  )

  const strvaluespliceonly = useCallback(
    function (index: number, count: number, insert?: string) {
      if (count > 0) {
        codepage?.delete(index, count)
      }
      if (ispresent(insert)) {
        codepage?.insert(index, insert)
      }
      const cursor = index + (insert ?? '').length
      updatescrolling(cursor)
      useEditor.setState({ cursor })
    },
    [codepage, updatescrolling],
  )

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

  function strchangeindent(dec = true) {
    if (hasselection) {
      const lines = strvalueselected.split('\n')
      for (let l = 0; l < lines.length; ++l) {
        const line = lines[l]
        if (dec) {
          if (lines[l].startsWith(' ')) {
            lines[l] = line.substring(1)
          }
        } else {
          lines[l] = ` ${line}`
        }
      }
      strvaluespliceonly(ii1, iic, lines.join('\n'))
    } else {
      // toggle single line
    }
  }

  function deleteselection() {
    if (hasselection) {
      updatescrolling(ii1)
      useEditor.setState({ cursor: ii1 })
      strvaluesplice(ii1, iic)
    }
  }

  function resettoend() {
    updatescrolling(codeend)
    useEditor.setState({ cursor: codeend, select: undefined })
  }

  const movexcursor = useCallback(
    function (newcursor: number) {
      useEditor.setState(() => {
        const cursor = clamp(newcursor, 0, codeend)
        updatescrolling(cursor)
        return { cursor }
      })
    },
    [codeend, updatescrolling],
  )

  const moveycursor = useCallback(
    function (inc: number) {
      useEditor.setState(() => {
        let cursor = 0
        const yoffset = Math.round(ycursor + inc)
        if (yoffset < 0) {
          cursor = 0
        } else if (yoffset > rowsend) {
          cursor = codeend
        } else {
          const row = rows[yoffset]
          cursor = row.start + Math.min(xcursor, row.code.length - 1)
        }
        updatescrolling(cursor)
        return { cursor }
      })
    },
    [codeend, rows, rowsend, xcursor, ycursor, updatescrolling],
  )

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
        updatescrolling(cursor)
        useEditor.setState({ cursor })
      }
    }
    undomanager?.on('stack-item-added', handleadded)
    undomanager?.on('stack-item-popped', handlepopped)
    return () => {
      undomanager?.off('stack-item-added', handleadded)
      undomanager?.off('stack-item-popped', handlepopped)
    }
  }, [undomanager, tapeeditor.cursor, updatescrolling])

  return (
    <>
      <Scrollable
        blocking
        x={edge.left}
        y={edge.top}
        width={edge.width}
        height={edge.height}
        onClick={() => {
          document.getElementById('touchtext')?.focus()
        }}
        onScroll={(ydelta: number) => moveycursor(ydelta * 0.75)}
      />
      <UserInput
        MOVE_LEFT={(mods) => {
          trackselection(mods.shift)
          if (mods.ctrl) {
            movexcursor(coderow.start)
          } else {
            movexcursor(tapeeditor.cursor - (mods.alt ? 10 : 1))
          }
        }}
        MOVE_RIGHT={(mods) => {
          trackselection(mods.shift)
          if (mods.ctrl) {
            movexcursor(coderow.end)
          } else {
            movexcursor(tapeeditor.cursor + (mods.alt ? 10 : 1))
          }
        }}
        MOVE_UP={(mods) => {
          trackselection(mods.shift)
          if (mods.ctrl) {
            movexcursor(0)
          } else {
            moveycursor(mods.alt ? -10 : -1)
          }
        }}
        MOVE_DOWN={(mods) => {
          trackselection(mods.shift)
          if (mods.ctrl) {
            movexcursor(codeend)
          } else {
            moveycursor(mods.alt ? 10 : 1)
          }
        }}
        OK_BUTTON={() => {
          if (ispresent(codepage)) {
            // insert newline !
            codepage.insert(tapeeditor.cursor, `\n`)
            const cursor = tapeeditor.cursor + 1
            updatescrolling(cursor)
            useEditor.setState({ cursor })
          }
        }}
        CANCEL_BUTTON={(mods) => {
          if (mods.shift || mods.alt || mods.ctrl) {
            registerterminalclose(SOFTWARE, player)
          } else {
            registereditorclose(SOFTWARE, player)
          }
        }}
        MENU_BUTTON={(mods) => {
          registerterminalinclayout(SOFTWARE, player, !mods.shift)
        }}
        keydown={(event) => {
          if (!ispresent(codepage)) {
            return
          }

          const { key } = event
          const lkey = NAME(key)
          const mods = modsfromevent(event)

          switch (lkey) {
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
                    updatescrolling(codeend)
                    useEditor.setState({ cursor: codeend, select: 0 })
                    break
                  case 'c':
                    if (ispresent(withclipboard())) {
                      withclipboard()
                        .writeText(strvalueselected)
                        .catch((err) =>
                          apierror(SOFTWARE, player, 'clipboard', err),
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
                          apierror(SOFTWARE, player, 'clipboard', err),
                        )
                    } else {
                      resettoend()
                    }
                    break
                  case 'x':
                    if (ispresent(withclipboard()) && hasselection) {
                      withclipboard()
                        .writeText(strvalueselected)
                        .then(() => deleteselection())
                        .catch((err) =>
                          apierror(SOFTWARE, player, 'clipboard', err),
                        )
                    } else {
                      resettoend()
                    }
                    break
                  case 'p':
                    if (hasselection) {
                      vmcli(SOFTWARE, player, strvalueselected)
                      apilog(
                        SOFTWARE,
                        player,
                        `running $WHITE${strvalueselected.substring(0, 16)}...$BLUE`,
                      )
                    } else {
                      // run current line
                      vmcli(SOFTWARE, player, coderow.code)
                      apilog(
                        SOFTWARE,
                        player,
                        `running $WHITE${coderow.code.substring(0, 16)}...$BLUE`,
                      )
                    }
                    break
                  case `'`:
                    strtogglecomments()
                    break
                }
              } else if (mods.alt) {
                // no-op ?? - could this shove text around when you have selection ??
                // or jump by 10 or by word ??
              } else if (event.key.length === 1) {
                if (hasselection) {
                  if (event.key === `'`) {
                    strtogglecomments()
                  } else if (event.key === ' ') {
                    strchangeindent(event.shiftKey)
                  } else {
                    strvaluesplice(ii1, iic, event.key)
                  }
                } else {
                  const cursor = tapeeditor.cursor + event.key.length
                  codepage.insert(tapeeditor.cursor, event.key)
                  updatescrolling(cursor)
                  useEditor.setState({ cursor })
                }
              }
              break
          }
        }}
      />
    </>
  )
}
