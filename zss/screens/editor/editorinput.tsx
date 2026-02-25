import { useRef } from 'react'
import {
  apierror,
  apilog,
  registereditorclose,
  registerterminalclose,
  registerterminalinclayout,
  vmcli,
} from 'zss/device/api'
import { type SharedTextHandle } from 'zss/device/modem'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { withclipboard } from 'zss/feature/keyboard'
import { useEditor } from 'zss/gadget/data/state'
import { useBlink, useWriteText } from 'zss/gadget/hooks'
import { Scrollable } from 'zss/gadget/scrollable'
import { UserInput, modsfromevent } from 'zss/gadget/userinput'
import { MAYBE, ispresent } from 'zss/mapping/types'
import { AUTO_COMPLETE } from 'zss/screens/tape/autocomplete'
import { EDITOR_CODE_ROW } from 'zss/screens/tape/common'
import { ismac } from 'zss/words/system'
import { textformatreadedges } from 'zss/words/textformat'
import { NAME, PT } from 'zss/words/types'

import {
  changeIndent,
  computeSelection,
  drawLocalCursor,
  drawRemoteCursors,
  toggleComments,
} from './editorinputhelpers'
import {
  useCursorNavigation,
  useEditorSplice,
  usePresenceBroadcast,
  useUndoRedo,
} from './editorinputhooks'

export type EditorInputProps = {
  xcursor: number
  ycursor: number
  xoffset: number
  yoffset: number
  rows: EDITOR_CODE_ROW[]
  codepage: MAYBE<SharedTextHandle>
  autocomplete: AUTO_COMPLETE
  autocompleteactive?: boolean
}

export function EditorInput({
  xcursor,
  ycursor,
  xoffset,
  yoffset,
  rows,
  codepage,
  autocomplete,
}: EditorInputProps) {
  const blink = useBlink()
  const context = useWriteText()
  const tapeeditor = useEditor()
  const player = registerreadplayer()
  const blinkdelta = useRef<PT>(undefined)
  const cursorBeforeEditRef = useRef(0)
  const edge = textformatreadedges(context)

  const codepageKey = ispresent(codepage)
    ? `${codepage.nodeId.sid}:${codepage.nodeId.time}`
    : undefined

  const strvalue = ispresent(codepage) ? codepage.toJSON() : ''
  const rowsend = rows.length - 1
  const codeend = rows[rowsend].end
  const coderow = rows[ycursor]

  // --- hooks ---

  const remotePresence = usePresenceBroadcast(
    codepageKey,
    codepage,
    tapeeditor.cursor,
    tapeeditor.select,
    player,
  )

  const { updatescrolling, movexcursor, moveycursor } = useCursorNavigation(
    rows,
    edge.width,
    edge.height,
    codeend,
    rowsend,
    xcursor,
    ycursor,
  )

  const { strvaluesplice, strvaluespliceonly } = useEditorSplice(
    codepage,
    updatescrolling,
    cursorBeforeEditRef,
    tapeeditor.cursor,
  )

  const undomanager = useUndoRedo(
    codepage,
    tapeeditor.cursor,
    updatescrolling,
    cursorBeforeEditRef,
  )

  // --- drawing ---

  const xblink = xcursor + 1 - xoffset
  const yblink = ycursor + 2 - yoffset

  drawLocalCursor(codepage, blink, xblink, yblink, blinkdelta, edge, context)
  drawRemoteCursors(
    codepage,
    remotePresence,
    player,
    rows,
    xoffset,
    yoffset,
    edge,
    context,
  )

  // --- selection state ---

  const { ii1, iic, hasselection, strvalueselected } = computeSelection(
    tapeeditor.cursor,
    tapeeditor.select,
    strvalue,
  )

  // --- inline helpers that depend on editor state ---

  function trackselection(active: boolean) {
    if (active) {
      if (!ispresent(tapeeditor.select)) {
        useEditor.setState({ select: tapeeditor.cursor })
      }
    } else {
      useEditor.setState({ select: undefined })
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

  const acactive =
    tapeeditor.autocompleteactive && autocomplete.suggestions.length > 0
  const acnumRows = autocomplete.suggestions.length
  const accursorRowY = edge.top + 2 + ycursor - yoffset + 1
  const acdrawBelow = accursorRowY + acnumRows <= edge.bottom - 1

  function acceptsuggestion() {
    if (!ispresent(codepage) || autocomplete.suggestions.length === 0) {
      return
    }
    const idx =
      tapeeditor.acindex < 0
        ? 0
        : Math.min(tapeeditor.acindex, autocomplete.suggestions.length - 1)
    const suggestion = autocomplete.suggestions[idx]
    if (!suggestion) {
      return
    }
    strvaluesplice(
      autocomplete.wordstart,
      autocomplete.prefix.length,
      suggestion,
    )
  }

  // --- render ---

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
          useEditor.setState({ acindex: -1 })
        }}
        MOVE_RIGHT={(mods) => {
          trackselection(mods.shift)
          if (mods.ctrl) {
            movexcursor(coderow.end)
          } else {
            movexcursor(tapeeditor.cursor + (mods.alt ? 10 : 1))
          }
          useEditor.setState({ acindex: -1 })
        }}
        MOVE_UP={(mods) => {
          if (acactive) {
            const next = acdrawBelow
              ? Math.max(0, tapeeditor.acindex - 1)
              : Math.min(acnumRows - 1, tapeeditor.acindex + 1)
            useEditor.setState({ acindex: next })
            return
          }
          trackselection(mods.shift)
          if (mods.ctrl) {
            movexcursor(0)
          } else {
            moveycursor(mods.alt ? -10 : -1)
          }
          useEditor.setState({ acindex: -1 })
        }}
        MOVE_DOWN={(mods) => {
          if (acactive) {
            const next = acdrawBelow
              ? tapeeditor.acindex < 0
                ? 0
                : Math.min(acnumRows - 1, tapeeditor.acindex + 1)
              : Math.max(0, tapeeditor.acindex - 1)
            useEditor.setState({ acindex: next })
            return
          }
          trackselection(mods.shift)
          if (mods.ctrl) {
            movexcursor(codeend)
          } else {
            moveycursor(mods.alt ? 10 : 1)
          }
          useEditor.setState({ acindex: -1 })
        }}
        OK_BUTTON={() => {
          if (acactive) {
            acceptsuggestion()
            return
          }
          if (ispresent(codepage)) {
            cursorBeforeEditRef.current = tapeeditor.cursor
            codepage.insert(tapeeditor.cursor, `\n`)
            const cursor = tapeeditor.cursor + 1
            updatescrolling(cursor)
            useEditor.setState({ cursor, acindex: -1 })
          }
        }}
        CANCEL_BUTTON={(mods) => {
          if (acactive) {
            useEditor.setState({ acindex: -1, autocompleteactive: false })
            return
          }
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
              useEditor.setState({ acindex: 0 })
              break
            case 'backspace':
              if (hasselection) {
                deleteselection()
              } else if (strvalue.length > 0) {
                strvaluesplice(Math.max(tapeeditor.cursor - 1, 0), 1)
              }
              useEditor.setState({ acindex: 0 })
              break
            default:
              if (mods.ctrl) {
                switch (lkey) {
                  case 'z':
                    if (undomanager) {
                      if (ismac && mods.shift) {
                        undomanager.redo()
                      } else {
                        undomanager.undo()
                      }
                    }
                    break
                  case 'y':
                    if (undomanager && !ismac) {
                      undomanager.redo()
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
                      vmcli(SOFTWARE, player, coderow.code)
                      apilog(
                        SOFTWARE,
                        player,
                        `running $WHITE${coderow.code.substring(0, 16)}...$BLUE`,
                      )
                    }
                    break
                  case `'`:
                    if (hasselection) {
                      toggleComments(strvalueselected, ii1, iic, strvaluesplice)
                    }
                    break
                }
              } else if (mods.alt) {
                // reserved for future use
              } else if (event.key.length === 1) {
                if (hasselection) {
                  if (event.key === `'`) {
                    toggleComments(strvalueselected, ii1, iic, strvaluesplice)
                  } else if (event.key === ' ') {
                    changeIndent(
                      strvalueselected,
                      ii1,
                      iic,
                      event.shiftKey,
                      strvaluespliceonly,
                    )
                  } else {
                    strvaluesplice(ii1, iic, event.key)
                  }
                } else {
                  cursorBeforeEditRef.current = tapeeditor.cursor
                  const cursor = tapeeditor.cursor + event.key.length
                  codepage.insert(tapeeditor.cursor, event.key)
                  updatescrolling(cursor)
                  useEditor.setState({
                    cursor,
                    acindex: 0,
                    autocompleteactive: true,
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
