import type { Patch } from 'json-joy/lib/json-crdt-patch'
import { useCallback, useEffect, useRef } from 'react'
import {
  apierror,
  apilog,
  registereditorclose,
  registerterminalclose,
  registerterminalinclayout,
  vmcli,
} from 'zss/device/api'
import {
  type SharedTextHandle,
  getModemLog,
  modemApplyAndSyncPatch,
  modembroadcastpresence,
  patchAffectsNode,
  usePresence,
} from 'zss/device/modem'
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
  codepage: MAYBE<SharedTextHandle>
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

  // Get codepage key for presence tracking
  const codepageKey = ispresent(codepage)
    ? `${codepage.nodeId.sid}:${codepage.nodeId.time}`
    : undefined

  // Get remote presence for this codepage
  const remotePresence = usePresence(codepageKey)

  // Debounced presence broadcast ref
  const presenceTimeoutRef = useRef<number | undefined>(undefined)

  // split by line
  const strvalue = ispresent(codepage) ? codepage.toJSON() : ''
  const rowsend = rows.length - 1

  // Generate color from player ID (simple hash)
  const getColorForPlayer = useCallback((playerId: string): string => {
    let hash = 0
    for (let i = 0; i < playerId.length; i++) {
      hash = playerId.charCodeAt(i) + ((hash << 5) - hash)
    }
    const hue = Math.abs(hash % 360)
    return `hsl(${hue}, 70%, 50%)`
  }, [])

  // Broadcast presence when cursor or selection changes
  useEffect(() => {
    if (!codepageKey || !ispresent(codepage)) {
      // Clear timeout if editor closes
      if (presenceTimeoutRef.current) {
        clearTimeout(presenceTimeoutRef.current)
        presenceTimeoutRef.current = undefined
      }
      return
    }

    // Clear existing timeout
    if (presenceTimeoutRef.current) {
      clearTimeout(presenceTimeoutRef.current)
    }

    // Debounce presence updates (broadcast every 100ms max)
    presenceTimeoutRef.current = window.setTimeout(() => {
      modembroadcastpresence(
        player,
        codepageKey,
        tapeeditor.cursor,
        tapeeditor.select,
        `User ${player.slice(0, 6)}`, // Simple name from player ID
        getColorForPlayer(player), // Generate color from player ID
      )
    }, 100)

    return () => {
      if (presenceTimeoutRef.current) {
        clearTimeout(presenceTimeoutRef.current)
        presenceTimeoutRef.current = undefined
      }
    }
  }, [
    codepageKey,
    tapeeditor.cursor,
    tapeeditor.select,
    player,
    codepage,
    getColorForPlayer,
  ])

  // draw local cursor
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

  // draw remote cursors
  if (ispresent(codepage) && remotePresence.length > 0) {
    for (const presence of remotePresence) {
      // Skip our own presence
      if (presence.clientId === player) continue

      const remoteCursor = presence.cursor
      const remoteY = findcursorinrows(remoteCursor, rows)
      const remoteRow = rows[remoteY]
      if (!remoteRow) continue

      const remoteX = remoteCursor - remoteRow.start
      const remoteXblink = remoteX + 1 - xoffset
      const remoteYblink = remoteY + 2 - yoffset

      const x = edge.left + remoteXblink
      const y = edge.top + remoteYblink

      // visibility clip
      if (
        y > edge.top + 1 &&
        y < edge.bottom &&
        x > edge.left &&
        x < edge.right
      ) {
        const atchar = x + y * context.width
        // Draw remote cursor (different character, colored)
        applystrtoindex(atchar, String.fromCharCode(219), context) // Block character
        // Use a distinct color for remote cursors (cyan background)
        applycolortoindexes(atchar, atchar, COLOR.WHITE, COLOR.CYAN, context)

        // Draw selection if present
        if (ispresent(presence.select) && presence.select !== presence.cursor) {
          const selStart = Math.min(presence.cursor, presence.select)
          const selEnd = Math.max(presence.cursor, presence.select)
          const selStartY = findcursorinrows(selStart, rows)
          const selEndY = findcursorinrows(selEnd, rows)

          for (let selY = selStartY; selY <= selEndY; selY++) {
            const selRow = rows[selY]
            if (!selRow) continue

            const selStartX = selY === selStartY ? selStart - selRow.start : 0
            const selEndX =
              selY === selEndY ? selEnd - selRow.start : selRow.code.length

            for (let selX = selStartX; selX < selEndX; selX++) {
              const selXblink = selX + 1 - xoffset
              const selYblink = selY + 2 - yoffset
              const selXPos = edge.left + selXblink
              const selYPos = edge.top + selYblink

              if (
                selYPos > edge.top + 1 &&
                selYPos < edge.bottom &&
                selXPos > edge.left &&
                selXPos < edge.right
              ) {
                const selAtchar = selXPos + selYPos * context.width
                // Highlight selection background
                applycolortoindexes(
                  selAtchar,
                  selAtchar,
                  COLOR.BLACK,
                  COLOR.DKGRAY,
                  context,
                )
              }
            }
          }
        }
      }
    }
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
      cursorBeforeEditRef.current = tapeeditor.cursor
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
    [codepage, updatescrolling, tapeeditor.cursor],
  )

  const strvaluespliceonly = useCallback(
    function (index: number, count: number, insert?: string) {
      cursorBeforeEditRef.current = tapeeditor.cursor
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
    [codepage, updatescrolling, tapeeditor.cursor],
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

  /** Number of undo/redo steps to perform per Cmd+Z / Cmd+Shift+Z. Set to 1 for single-step. */
  const UNDO_REDO_BATCH_SIZE = 1

  type UndoEntry = {
    patch: Patch
    undoPatch: Patch
    cursorBefore: number
    cursorAfter?: number
  }
  const undoStack = useRef<UndoEntry[]>([])
  const redoStack = useRef<UndoEntry[]>([])
  const cursorBeforeEditRef = useRef(0)

  const undomanager = ispresent(codepage)
    ? {
        undo(count: number = UNDO_REDO_BATCH_SIZE) {
          const n = Math.min(count, undoStack.current.length)
          if (n <= 0) return
          const batch: UndoEntry[] = []
          for (let i = 0; i < n; i++) {
            const top = undoStack.current.pop()
            if (!top) break
            batch.push(top)
          }
          const currentCursor = tapeeditor.cursor
          for (let i = batch.length - 1; i >= 0; i--) {
            const entry = batch[i]
            const cursorAfter =
              i === 0 ? currentCursor : batch[i - 1].cursorBefore
            redoStack.current.push({ ...entry, cursorAfter })
          }
          for (const entry of batch) {
            modemApplyAndSyncPatch(entry.undoPatch)
          }
          const oldest = batch[batch.length - 1]
          updatescrolling(oldest.cursorBefore)
          useEditor.setState({ cursor: oldest.cursorBefore, select: undefined })
        },
        redo(count: number = UNDO_REDO_BATCH_SIZE) {
          const n = Math.min(count, redoStack.current.length)
          if (n <= 0) return
          const log = getModemLog()
          let newCursor = tapeeditor.cursor
          for (let i = 0; i < n; i++) {
            const top = redoStack.current.pop()
            if (!top) break
            let redoPatch: Patch
            try {
              redoPatch = log.undo(top.undoPatch)
            } catch {
              const [rebased] = log.rebaseBatch([top.patch])
              if (!rebased) continue
              redoPatch = rebased
            }
            modemApplyAndSyncPatch(redoPatch)
            let newUndoPatch: Patch
            try {
              newUndoPatch = log.undo(redoPatch)
            } catch {
              newUndoPatch = top.undoPatch
            }
            undoStack.current.push({
              patch: redoPatch,
              undoPatch: newUndoPatch,
              cursorBefore: top.cursorBefore,
              cursorAfter: tapeeditor.cursor,
            })
            newCursor = top.cursorAfter ?? tapeeditor.cursor
          }
          updatescrolling(newCursor)
          useEditor.setState({ cursor: newCursor, select: undefined })
        },
      }
    : undefined

  useEffect(() => {
    if (!ispresent(codepage)) return
    const log = getModemLog()
    const unsub = log.end.api.onFlush.listen((patch: Patch) => {
      if (!patchAffectsNode(patch, codepage.nodeId)) return
      try {
        const undoPatch = log.undo(patch)
        undoStack.current.push({
          patch,
          undoPatch,
          cursorBefore: cursorBeforeEditRef.current,
        })
        redoStack.current = []
      } catch {
        // log.undo can throw for edge cases
      }
    })
    return () => unsub()
  }, [codepage, codepage?.nodeId?.sid, codepage?.nodeId?.time])

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
            cursorBeforeEditRef.current = tapeeditor.cursor
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
                    if (undomanager) {
                      if (ismac && mods.shift) undomanager.redo()
                      else undomanager.undo()
                    }
                    break
                  case 'y':
                    if (undomanager && !ismac) undomanager.redo()
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
                  cursorBeforeEditRef.current = tapeeditor.cursor
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
