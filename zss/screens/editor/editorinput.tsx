import { useEffect } from 'react'
import {
  apierror,
  apitoast,
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
import { useDeviceData } from 'zss/gadget/device'
import { Scrollable } from 'zss/gadget/scrollable'
import {
  UserInput,
  getmobiletextelement,
  mobiletextfocus,
  modsfromevent,
  onmobiletextinput,
} from 'zss/gadget/userinput'
import { useWriteText } from 'zss/gadget/writetext'
import { clamp } from 'zss/mapping/number'
import { MAYBE, ispresent } from 'zss/mapping/types'
import {
  AUTO_COMPLETE,
  drawautocomplete,
  drawcommandarghint,
} from 'zss/screens/tape/autocomplete'
import { applyautocompletesuggestion } from 'zss/screens/tape/autocompleteui'
import { commandromhint } from 'zss/screens/tape/commandarghints'
import { EDITOR_CODE_ROW } from 'zss/screens/tape/common'
import { ismac } from 'zss/words/system'
import { textformatreadedges } from 'zss/words/textformat'
import { COLOR, NAME } from 'zss/words/types'
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
  zsswordcolormap: Map<string, COLOR>
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
  zsswordcolormap,
}: EditorInputProps) {
  const context = useWriteText()
  const tapeeditor = useEditor(
    useShallow((state) => ({ cursor: state.cursor, select: state.select })),
  )
  const zsswords = useGadgetClient(useEqual((state) => state.zsswords))
  const autocompleteindex = useTape((state) => state.autocompleteindex)
  const player = registerreadplayer()
  const usemobiletextcapture = useDeviceData(
    (state) => state.usemobiletextcapture,
  )
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
    codepage,
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

  // Tier A: Android soft keyboard — `input`/IME on hidden field (keydown alone is unreliable).
  useEffect(() => {
    if (!usemobiletextcapture || !ispresent(codepage)) {
      return
    }
    return onmobiletextinput((newString, selectionStart) => {
      const prev = codepage.toJSON()
      if (newString === prev) {
        return
      }
      strvaluesplice(0, prev.length, newString)
      const pos = clamp(selectionStart, 0, newString.length)
      updatescrolling(pos)
      useEditor.setState({ cursor: pos, select: undefined })
    })
  }, [usemobiletextcapture, codepage, strvaluesplice, updatescrolling])

  useEffect(() => {
    if (!usemobiletextcapture || !ispresent(codepage)) {
      return
    }
    const el = getmobiletextelement()
    if (!el || document.activeElement !== el) {
      return
    }
    el.value = strvalue
    const cur = tapeeditor.cursor
    const sel = tapeeditor.select
    if (!ispresent(sel)) {
      el.setSelectionRange(cur, cur)
    } else {
      const l = Math.min(sel, cur)
      let r = Math.max(sel, cur)
      if (r !== l && r === cur) {
        r--
      }
      el.setSelectionRange(l, r + 1)
    }
  }, [
    usemobiletextcapture,
    strvalue,
    tapeeditor.cursor,
    tapeeditor.select,
    codepage,
  ])

  // --- drawing ---

  const xblink = xcursor + 1 - xoffset
  const yblink = ycursor + 2 - yoffset

  drawlocalcursor(codepage, xblink, yblink, edge, context)
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
      zsswordcolormap,
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
      {
        romhint: commandromhint(autocomplete.hintcommandname),
      },
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
    const applied = applyautocompletesuggestion(
      autocomplete,
      autocompleteindex,
      (wordstart, prefixlen, word) => {
        strvaluesplice(wordstart, prefixlen, word)
      },
    )
    if (applied) {
      useTape.setState({ autocompleteindex: -1 })
    }
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
          if (usemobiletextcapture) {
            mobiletextfocus()
            queueMicrotask(() => {
              const el = getmobiletextelement()
              if (!el || !ispresent(codepage)) {
                return
              }
              const s = codepage.toJSON()
              el.value = s
              const { cursor: cur, select: sel } = useEditor.getState()
              if (!ispresent(sel)) {
                el.setSelectionRange(cur, cur)
              } else {
                const l = Math.min(sel, cur)
                let r = Math.max(sel, cur)
                if (r !== l && r === cur) {
                  r--
                }
                el.setSelectionRange(l, r + 1)
              }
            })
          }
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
                      apitoast(
                        SOFTWARE,
                        player,
                        `running $WHITE${strvalueselected.substring(0, 16)}...$BLUE`,
                      )
                    } else {
                      vmcli(SOFTWARE, player, coderow.code)
                      apitoast(
                        SOFTWARE,
                        player,
                        `running $WHITE${coderow.code.substring(0, 16)}...$BLUE`,
                      )
                    }
                    break
                  case 'b': {
                    const { title, path } = useTape.getState().editor
                    registereditorbookmarkscroll(SOFTWARE, player, title, path)
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
