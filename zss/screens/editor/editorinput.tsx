import { useRef } from 'react'
import {
  apierror,
  apilog,
  registereditorbookmarkscroll,
  registereditorclose,
  registerterminalclose,
  registerterminalinclayout,
  vmcli,
} from 'zss/device/api'
import { type SharedTextHandle } from 'zss/device/modem'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { withclipboard } from 'zss/feature/keyboard'
import {
  useEditor,
  useEqual,
  useGadgetClient,
  useTape,
} from 'zss/gadget/data/state'
import { Scrollable } from 'zss/gadget/scrollable'
import { UserInput, modsfromevent, touchtextfocus } from 'zss/gadget/userinput'
import { useWriteText } from 'zss/gadget/writetext'
import { MAYBE, ispresent } from 'zss/mapping/types'
import {
  AUTO_COMPLETE,
  drawautocomplete,
  drawcommandarghint,
} from 'zss/screens/tape/autocomplete'
import { EDITOR_CODE_ROW } from 'zss/screens/tape/common'
import { ismac } from 'zss/words/system'
import { textformatreadedges } from 'zss/words/textformat'
import { NAME, PT } from 'zss/words/types'
import { useShallow } from 'zustand/react/shallow'

import {
  changeindent,
  computeselection,
  drawlocalcursor,
  drawremotecursors,
  togglecomments,
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
  autocompleteactive: boolean
}

export function EditorInput({
  xcursor,
  ycursor,
  xoffset,
  yoffset,
  rows,
  codepage,
  autocomplete,
  autocompleteactive,
}: EditorInputProps) {
  const context = useWriteText()
  const tapeeditor = useEditor(
    useShallow((state) => ({ cursor: state.cursor, select: state.select })),
  )
  const zsswords = useGadgetClient(useEqual((state) => state.zsswords))
  const autocompleteindex = useTape((state) => state.autocompleteindex)
  const player = registerreadplayer()
  const blinkdelta = useRef<PT>(undefined)
  const edge = textformatreadedges(context)

  const codepageKey = ispresent(codepage) ? codepage.nodeId.key : undefined

  const strvalue = ispresent(codepage) ? codepage.toJSON() : ''
  const rowsend = rows.length - 1
  const codeend = rows[rowsend].end
  const coderow = rows[ycursor]
  const coderowlength = coderow.code.length

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

  const { undomanager } = useUndoRedo(codepage, updatescrolling)

  const { strvaluesplice, strvaluespliceonly } = useEditorSplice(
    codepage,
    updatescrolling,
  )

  // --- drawing ---

  const xblink = xcursor + 1 - xoffset
  const yblink = ycursor + 2 - yoffset

  drawlocalcursor(codepage, xblink, yblink, blinkdelta, edge, context)
  drawremotecursors(
    codepage,
    remotePresence,
    player,
    rows,
    xoffset,
    yoffset,
    edge,
    context,
  )

  const suggestionslength = autocomplete.suggestions.length
  const starty = edge.top + 2 + (ycursor - yoffset) + 1
  const drawabove = starty + suggestionslength > edge.bottom - 1

  const startx = edge.left - xoffset
  if (autocompleteactive) {
    drawautocomplete(
      autocomplete,
      autocompleteindex,
      startx + autocomplete.wordcol,
      drawabove ? starty - 1 : starty,
      edge,
      context,
      zsswords,
      drawabove,
    )
  }

  if (autocomplete.endoflinehint && autocomplete.endoflineargs.length > 0) {
    drawcommandarghint(
      autocomplete.endoflineargs,
      startx + coderowlength + 1,
      starty - 1,
      edge,
      context,
    )
  }

  // --- selection state ---

  const { ii1, iic, hasselection, strvalueselected } = computeselection(
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

  function acceptsuggestion() {
    if (autocomplete.suggestions.length === 0) {
      return
    }
    const idx = Math.min(autocompleteindex, autocomplete.suggestions.length - 1)
    const suggestion = autocomplete.suggestions[idx]
    if (!suggestion) {
      return
    }
    strvaluesplice(
      autocomplete.wordstart,
      autocomplete.prefix.length,
      suggestion.word,
    )
    useTape.setState({ autocompleteindex: -1 })
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
          touchtextfocus()
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
          useTape.setState({ autocompleteindex: -1 })
        }}
        MOVE_RIGHT={(mods) => {
          trackselection(mods.shift)
          if (mods.ctrl) {
            movexcursor(coderow.end)
          } else {
            movexcursor(tapeeditor.cursor + (mods.alt ? 10 : 1))
          }
          useTape.setState({ autocompleteindex: -1 })
        }}
        MOVE_UP={(mods) => {
          if (autocompleteactive) {
            const maxIdx = autocomplete.suggestions.length - 1
            useTape.setState({
              autocompleteindex: drawabove
                ? Math.min(
                    maxIdx,
                    (autocompleteindex < 0 ? 0 : autocompleteindex) + 1,
                  )
                : Math.max(0, autocompleteindex - 1),
            })
            return
          }
          trackselection(mods.shift)
          if (mods.ctrl) {
            movexcursor(0)
          } else {
            moveycursor(mods.alt ? -10 : -1)
          }
          useTape.setState({ autocompleteindex: -1 })
        }}
        MOVE_DOWN={(mods) => {
          if (autocompleteactive) {
            const maxIdx = autocomplete.suggestions.length - 1
            useTape.setState({
              autocompleteindex: drawabove
                ? Math.max(0, autocompleteindex - 1)
                : Math.min(
                    maxIdx,
                    autocompleteindex < 0 ? 0 : autocompleteindex + 1,
                  ),
            })
            return
          }
          trackselection(mods.shift)
          if (mods.ctrl) {
            movexcursor(codeend)
          } else {
            moveycursor(mods.alt ? 10 : 1)
          }
          useTape.setState({ autocompleteindex: -1 })
        }}
        OK_BUTTON={() => {
          if (autocompleteactive) {
            acceptsuggestion()
            return
          }
          if (ispresent(codepage)) {
            strvaluesplice(tapeeditor.cursor, 0, `\n`)
            useTape.setState({ autocompleteindex: -1 })
          }
        }}
        CANCEL_BUTTON={(mods) => {
          if (autocompleteactive) {
            useTape.setState({ autocompleteindex: -1 })
            return
          }
          if (mods.shift || mods.alt || mods.ctrl) {
            registerterminalclose(SOFTWARE, player)
          } else {
            registereditorclose(SOFTWARE, player)
          }
        }}
        MENU_BUTTON={(mods) => {
          if (autocompleteactive) {
            acceptsuggestion()
            return
          }
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
              useTape.setState({ autocompleteindex: 0 })
              break
            case 'backspace':
              if (hasselection) {
                deleteselection()
              } else if (strvalue.length > 0) {
                strvaluesplice(Math.max(tapeeditor.cursor - 1, 0), 1)
              }
              useTape.setState({ autocompleteindex: 0 })
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
                  case 'c': {
                    const clipboard = withclipboard()
                    if (ispresent(clipboard)) {
                      clipboard
                        .writeText(strvalueselected)
                        .catch((err) =>
                          apierror(SOFTWARE, player, 'clipboard', err),
                        )
                    } else {
                      resettoend()
                    }
                    break
                  }
                  case 'v': {
                    const clipboard = withclipboard()
                    if (ispresent(clipboard)) {
                      clipboard
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
                  }
                  case 'x': {
                    const clipboard = withclipboard()
                    if (ispresent(clipboard) && hasselection) {
                      clipboard
                        .writeText(strvalueselected)
                        .then(() => deleteselection())
                        .catch((err) =>
                          apierror(SOFTWARE, player, 'clipboard', err),
                        )
                    } else {
                      resettoend()
                    }
                    break
                  }
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
                  case 'b': {
                    const ed = useTape.getState().editor
                    if (ed.open) {
                      registereditorbookmarkscroll(SOFTWARE, player)
                    }
                    break
                  }
                  case `'`:
                    if (hasselection) {
                      togglecomments(strvalueselected, ii1, iic, strvaluesplice)
                    }
                    break
                }
              } else if (mods.alt) {
                // reserved for future use
              } else if (event.key.length === 1) {
                if (hasselection) {
                  if (event.key === `'`) {
                    togglecomments(strvalueselected, ii1, iic, strvaluesplice)
                  } else if (event.key === ' ') {
                    changeindent(
                      strvalueselected,
                      ii1,
                      iic,
                      event.shiftKey,
                      strvaluespliceonly,
                    )
                  } else {
                    strvaluesplice(ii1, iic, event.key)
                  }
                  useTape.setState({
                    autocompleteindex: event.key === ' ' ? -1 : 0,
                  })
                } else {
                  strvaluesplice(tapeeditor.cursor, 0, event.key)
                  useTape.setState({
                    autocompleteindex: event.key === ' ' ? -1 : 0,
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
