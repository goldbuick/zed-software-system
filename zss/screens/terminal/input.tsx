import { useCallback, useEffect, useMemo } from 'react'
import {
  apierror,
  registerterminalclose,
  registerterminalinclayout,
  vmcli,
  vmclirepeatlast,
  vmloader,
} from 'zss/device/api'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { withclipboard } from 'zss/feature/keyboard'
import { SpeechToText } from 'zss/feature/speechtotext'
import { storagewritehistorybuffer } from 'zss/feature/storage'
import { useGadgetClient, useTape, useTerminal } from 'zss/gadget/data/state'
import { Scrollable } from 'zss/gadget/scrollable'
import { UserInput, modsfromevent, touchtextfocus } from 'zss/gadget/userinput'
import { useWriteText } from 'zss/gadget/writetext'
import { clamp } from 'zss/mapping/number'
import { stringsplice } from 'zss/mapping/string'
import { MAYBE, ispresent, isstring } from 'zss/mapping/types'
import {
  EMPTY_AUTOCOMPLETE,
  drawautocomplete,
  drawcommandarghint,
  getautocomplete,
} from 'zss/screens/tape/autocomplete'
import {
  applycodetokencolors,
  buildzsswordcolors,
} from 'zss/screens/tape/colors'
import { bgcolor, setuplogitem } from 'zss/screens/tape/common'
import {
  applycolortoindexes,
  applystrtoindex,
  textformatreadedges,
  tokenizeandmeasuretextformat,
  tokenizeandwritetextformat,
  writeplaintext,
} from 'zss/words/textformat'
import { COLOR, NAME } from 'zss/words/types'
import { useShallow } from 'zustand/react/shallow'

import { tokenizeline } from './terminalinputhelpers'

type TerminalInputProps = {
  quickterminal: boolean
  voice2text: boolean
  tapeycursor: number
  logrowtotalheight: number
}

export function TerminalInput({
  quickterminal,
  voice2text,
  tapeycursor,
  logrowtotalheight,
}: TerminalInputProps) {
  const context = useWriteText()
  const tapeterminal = useTerminal()
  const [editoropen] = useTape(useShallow((state) => [state.editor.open]))
  const autocompleteindex = useTape((state) => state.autocompleteindex)
  const zsswords = useGadgetClient((state) => state.zsswords)

  const player = registerreadplayer()
  const edge = textformatreadedges(context)

  // input & selection
  const inputstate = tapeterminal.buffer[tapeterminal.bufferindex]
  const inputlinetokens = useMemo(() => tokenizeline(inputstate), [inputstate])

  // local x input
  let ii1 = tapeterminal.xcursor
  let ii2 = tapeterminal.xcursor
  let hasselection = false

  // adjust input edges selection
  if (ispresent(tapeterminal.xselect) && ispresent(tapeterminal.yselect)) {
    hasselection = true
    ii1 = Math.min(tapeterminal.xcursor, tapeterminal.xselect)
    ii2 = Math.max(tapeterminal.xcursor, tapeterminal.xselect)
    if (tapeterminal.xcursor !== tapeterminal.xselect) {
      // tuck in right side
      --ii2
    }
  }

  const iic = ii2 - ii1 + 1
  const inputstateactive = tapeterminal.ycursor === 0
  const inputstateselected = hasselection
    ? inputstate.substring(ii1, ii2 + 1)
    : inputstate

  // update state
  const inputstatesetsplice = useCallback(
    (index: number, count: number, insert?: string) => {
      // we are trying to modify historical entries
      if (tapeterminal.bufferindex > 0) {
        // blank inputslot and snap index to 0
        useTerminal.setState({ bufferindex: 0 })
      }
      // write state
      tapeterminal.buffer[0] = stringsplice(inputstate, index, count, insert)
      useTerminal.setState({
        buffer: tapeterminal.buffer,
        // clear selection
        xselect: undefined,
        xcursor: index + (insert ?? '').length,
      })
    },
    [inputstate, tapeterminal.buffer, tapeterminal.bufferindex],
  )

  const inputstatereplace = useCallback(
    (replacewith: string) => {
      // we are trying to modify historical entries
      if (tapeterminal.bufferindex > 0) {
        // blank inputslot and snap index to 0
        useTerminal.setState({ bufferindex: 0 })
      }
      // write state
      tapeterminal.buffer[0] = replacewith
      useTerminal.setState({
        buffer: tapeterminal.buffer,
        // clear selection
        xselect: undefined,
        xcursor: replacewith.length,
      })
    },
    [tapeterminal.buffer, tapeterminal.bufferindex],
  )

  const visiblerows = edge.bottom - edge.top - (editoropen ? 0 : 2)
  const inputstateycursor = useCallback(
    (moveby: number) => {
      useTerminal.setState((state) => {
        const ycursor = clamp(
          Math.round(state.ycursor + moveby),
          0,
          logrowtotalheight,
        )
        const scroll = clamp(
          ycursor - Math.round(visiblerows * 0.5),
          0,
          logrowtotalheight - visiblerows,
        )
        return {
          ycursor,
          scroll,
        }
      })
    },
    [logrowtotalheight, visiblerows],
  )

  // navigate input history
  function inputstateswitch(switchto: number) {
    const ir = tapeterminal.buffer.length - 1
    const index = clamp(switchto, 0, ir)
    useTerminal.setState({
      bufferindex: index,
      scroll: 0,
      xcursor: tapeterminal.buffer[index].length,
      ycursor: 0,
      xselect: undefined,
      yselect: undefined,
    })
  }

  // track selection
  function trackselection(active: boolean) {
    if (active) {
      if (!ispresent(tapeterminal.xselect)) {
        useTerminal.setState({
          xselect: tapeterminal.xcursor,
          yselect: tapeterminal.ycursor,
        })
      }
    } else {
      useTerminal.setState({
        xselect: undefined,
        yselect: undefined,
      })
    }
  }

  function deleteselection() {
    if (ispresent(tapeterminal.xselect)) {
      useTerminal.setState({
        xcursor: ii1,
        xselect: undefined,
        yselect: undefined,
      })
      inputstatesetsplice(ii1, iic)
    }
  }

  const resettoend = useCallback(() => {
    useTerminal.setState({
      scroll: 0,
      xcursor: inputstate.length,
      ycursor: 0,
      xselect: undefined,
      yselect: undefined,
    })
  }, [inputstate.length])

  // autocomplete (ZSS words; only when focus on input line)
  const autocomplete = useMemo(() => {
    buildzsswordcolors(zsswords)
    if (!inputstateactive) {
      return EMPTY_AUTOCOMPLETE
    }
    const linewithnewline = inputstate + '\n'
    return getautocomplete(
      {
        start: 0,
        code: linewithnewline,
        end: inputstate.length,
        tokens: inputlinetokens,
      },
      tapeterminal.xcursor,
      zsswords,
    )
  }, [
    inputstateactive,
    inputstate,
    tapeterminal.xcursor,
    inputlinetokens,
    zsswords,
  ])

  function acceptsuggestion() {
    if (autocomplete.suggestions.length === 0) {
      return
    }
    const idx = Math.min(autocompleteindex, autocomplete.suggestions.length - 1)
    const suggestion = autocomplete.suggestions[idx]
    if (!suggestion) {
      return
    }
    inputstatesetsplice(
      autocomplete.wordstart,
      autocomplete.prefix.length,
      suggestion.word,
    )
    useTape.setState({ autocompleteindex: -1 })
  }

  // reset color & bg
  context.reset.bg = bgcolor(quickterminal)

  if (!quickterminal) {
    // write hint
    setuplogitem(false, 0, 0, context)
    const hint = `$DKCYAN${import.meta.env.ZSS_BRANCH_NAME}:${import.meta.env.ZSS_BRANCH_VERSION} ${import.meta.env.ZSS_COMMIT_MESSAGE}`
    const measured = tokenizeandmeasuretextformat(hint, edge.width, 1)
    context.x = edge.width - (measured?.measuredwidth ?? 0) - 1
    tokenizeandwritetextformat(hint, context, true)
  }

  // draw divider
  const de = '$196'
  const dc = '$205'
  const dm = dc.repeat(edge.width - 6)
  setuplogitem(false, 0, edge.height - 2, context)
  context.active.color = COLOR.WHITE
  tokenizeandwritetextformat(`  ${de}${dm}${de}  `, context, true)

  // draw input line
  const inputline = inputstate.padEnd(edge.width, ' ')
  setuplogitem(false, 0, edge.height - 1, context)
  context.active.color = COLOR.WHITE
  writeplaintext(inputline, context, true)

  if (!quickterminal) {
    const yoffset = (context.y - 1) * context.width
    applycodetokencolors(
      0,
      yoffset,
      edge.width,
      inputlinetokens,
      context,
      inputline,
    )
  }

  // draw selection
  if (
    ispresent(tapeterminal.xselect) &&
    ispresent(tapeterminal.yselect) &&
    tapeterminal.xcursor !== tapeterminal.xselect
  ) {
    // top - left
    const x1 = Math.min(tapeterminal.xcursor, tapeterminal.xselect)
    const y1 = Math.min(tapeterminal.ycursor, tapeterminal.yselect)
    // bottom - right
    const x2 = Math.max(tapeterminal.xcursor, tapeterminal.xselect) - 1
    const y2 = Math.max(tapeterminal.ycursor, tapeterminal.yselect)
    // write colors
    for (let iy = y1; iy <= y2; ++iy) {
      const p1 = x1 + (edge.bottom - iy) * edge.width
      const p2 = x2 + (edge.bottom - iy) * edge.width
      applycolortoindexes(p1, p2, 15, 8, context)
    }
  }

  // draw cursor
  const cx = edge.left + tapeterminal.xcursor
  const cy = edge.top + tapeycursor
  // visibility clip
  if (
    cy >= edge.top &&
    cy <= edge.bottom &&
    cx >= edge.left &&
    cx <= edge.right
  ) {
    const atchar = cx + cy * context.width
    applystrtoindex(atchar, String.fromCharCode(219), context)
    applycolortoindexes(
      atchar,
      atchar,
      COLOR.BLWHITE,
      context.reset.bg,
      context,
    )
  }

  // draw autocomplete (above input line when active)
  const autocompleteactive =
    !quickterminal &&
    autocompleteindex >= 0 &&
    autocomplete.suggestions.length > 0
  const startx = edge.left
  const starty = edge.top + edge.height - 1
  if (autocompleteactive) {
    drawautocomplete(
      autocomplete,
      autocompleteindex,
      startx + autocomplete.wordcol - 1,
      starty,
      edge,
      context,
      zsswords,
      true,
    )
  }
  if (autocomplete.endoflinehint && autocomplete.endoflineargs.length > 0) {
    drawcommandarghint(
      autocomplete.endoflineargs,
      startx + inputstate.length + 1,
      starty,
      edge,
      context,
    )
  }

  // handle speech to text
  useEffect(() => {
    let listener: MAYBE<SpeechToText>

    // #config voice2text on, use # or C to open terminal to start
    if (!voice2text || !quickterminal) {
      return
    }

    // track starting input
    const { buffer, bufferindex } = useTerminal.getState()
    const inputstart = buffer[bufferindex]

    if (inputstart !== '') {
      return
    }

    // handlers
    function onFinalised(value: string) {
      inputstatereplace(`${inputstart}${value}`)
      setTimeout(() => {
        const { buffer, bufferindex } = useTerminal.getState()
        const inputstate = buffer[bufferindex]
        const historybuffer: string[] = [
          '',
          inputstate,
          ...buffer.slice(1).filter((item) => item !== inputstate),
        ].filter((item) => item.includes('#broadcast') === false)
        // cache history
        storagewritehistorybuffer(historybuffer).catch((err: any) =>
          apierror(SOFTWARE, player, 'terminalinput', err.message),
        )
        useTerminal.setState({
          xcursor: 0,
          bufferindex: 0,
          xselect: undefined,
          yselect: undefined,
          buffer: historybuffer,
        })
        vmcli(SOFTWARE, player, inputstate)
        registerterminalclose(SOFTWARE, player)
      }, 512)
    }

    function onEndEvent() {}

    function onAnythingSaid(value: string) {
      inputstatereplace(`${inputstart}${value}`)
    }

    // start
    try {
      const speechlistener = new SpeechToText(
        onFinalised,
        onEndEvent,
        onAnythingSaid,
      )
      listener = speechlistener
      listener?.startListening()
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error: any) {
      // console.error(error.message)
    }

    // Cleanup function
    return () => {
      listener?.stopListening()
      listener = undefined
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
        onScroll={(deltay: number) => {
          trackselection(false)
          inputstateycursor(-deltay)
        }}
      />
      <UserInput
        MOVE_LEFT={(mods) => {
          useTape.setState({ autocompleteindex: -1 })
          trackselection(mods.shift)
          if (mods.ctrl) {
            useTerminal.setState({ xcursor: 0 })
          } else {
            useTerminal.setState({
              xcursor: clamp(
                tapeterminal.xcursor - (mods.alt ? 10 : 1),
                0,
                edge.right,
              ),
            })
          }
        }}
        MOVE_RIGHT={(mods) => {
          useTape.setState({ autocompleteindex: -1 })
          trackselection(mods.shift)
          if (mods.ctrl) {
            useTerminal.setState({
              xcursor: inputstateactive ? inputstate.length : edge.right,
            })
          } else {
            useTerminal.setState({
              xcursor: clamp(
                tapeterminal.xcursor + (mods.alt ? 10 : 1),
                0,
                edge.right,
              ),
            })
          }
        }}
        MOVE_UP={(mods) => {
          if (autocompleteactive) {
            useTape.setState({
              autocompleteindex: Math.min(
                autocomplete.suggestions.length - 1,
                autocompleteindex + 1,
              ),
            })
            return
          }
          if (mods.ctrl) {
            inputstateswitch(tapeterminal.bufferindex + 1)
          } else {
            trackselection(mods.shift)
            inputstateycursor(mods.alt ? 10 : 1)
          }
        }}
        MOVE_DOWN={(mods) => {
          if (autocompleteactive) {
            useTape.setState({
              autocompleteindex: Math.max(0, autocompleteindex - 1),
            })
            return
          }
          if (mods.ctrl) {
            inputstateswitch(tapeterminal.bufferindex - 1)
          } else {
            trackselection(mods.shift)
            inputstateycursor(-(mods.alt ? 10 : 1))
          }
        }}
        OK_BUTTON={() => {
          if (autocompleteactive) {
            acceptsuggestion()
            return
          }
          const invoke = hasselection ? inputstateselected : inputstate
          if (invoke.length) {
            if (inputstateactive) {
              const { buffer } = useTerminal.getState()
              const historybuffer: string[] = [
                '',
                invoke,
                ...buffer.slice(1).filter((item) => item !== invoke),
              ].filter((item) => item.includes('#broadcast') === false)
              // cache history
              storagewritehistorybuffer(historybuffer).catch((err) =>
                apierror(SOFTWARE, player, 'terminalinput', err.message),
              )
              useTerminal.setState({
                xcursor: 0,
                bufferindex: 0,
                xselect: undefined,
                yselect: undefined,
                buffer: historybuffer,
              })
              vmcli(SOFTWARE, player, invoke)
              if (quickterminal) {
                registerterminalclose(SOFTWARE, player)
              }
            } else {
              resettoend()
            }
          }
        }}
        CANCEL_BUTTON={() => {
          if (autocompleteactive) {
            useTape.setState({ autocompleteindex: -1 })
            return
          }
          registerterminalclose(SOFTWARE, player)
        }}
        MENU_BUTTON={(mods) => {
          if (autocompleteactive) {
            acceptsuggestion()
            return
          }
          registerterminalinclayout(SOFTWARE, player, !mods.shift)
        }}
        keydown={(event) => {
          const { key } = event
          const lkey = NAME(key)
          const mods = modsfromevent(event)
          switch (lkey) {
            case 'delete':
              // single line only
              if (inputstateactive) {
                if (hasselection) {
                  deleteselection()
                } else if (inputstate.length > 0) {
                  inputstatesetsplice(tapeterminal.xcursor, 1)
                }
              } else {
                resettoend()
              }
              useTape.setState({ autocompleteindex: 0 })
              break
            case 'backspace':
              // single line only
              if (inputstateactive) {
                if (hasselection) {
                  deleteselection()
                } else if (tapeterminal.xcursor > 0) {
                  inputstatesetsplice(tapeterminal.xcursor - 1, 1)
                }
              } else {
                resettoend()
              }
              useTape.setState({ autocompleteindex: 0 })
              break
            default:
              if (mods.ctrl) {
                switch (lkey) {
                  case 'p':
                    vmclirepeatlast(SOFTWARE, player)
                    break
                  case 'f':
                    if (!inputstate.startsWith('#search')) {
                      inputstatereplace(`#search ${inputstate}`)
                    }
                    break
                  case 'a':
                    useTerminal.setState({
                      // start
                      xselect: 0,
                      yselect: 0,
                      // end
                      xcursor: inputstate.length,
                      ycursor: 0,
                    })
                    break
                  case 'c':
                    // can support multiline ?
                    if (inputstateactive && ispresent(withclipboard())) {
                      void withclipboard()?.writeText(inputstateselected)
                    } else {
                      resettoend()
                    }
                    break
                  case 'v':
                    if (inputstateactive && ispresent(withclipboard())) {
                      void withclipboard()
                        ?.readText()
                        .then((text) => {
                          // did we paste json ??
                          try {
                            const json = JSON.parse(text)
                            if (
                              isstring(json.exported) &&
                              ispresent(json.data)
                            ) {
                              vmloader(
                                SOFTWARE,
                                player,
                                undefined,
                                'json',
                                `file:${json.exported}`,
                                JSON.stringify(json),
                              )
                              return
                            }
                            // eslint-disable-next-line @typescript-eslint/no-unused-vars
                          } catch (err: any) {
                            // console.error(err)
                          }
                          const cleantext = text.replaceAll('\r', '')
                          if (hasselection) {
                            inputstatesetsplice(ii1, iic, cleantext)
                          } else {
                            inputstatesetsplice(
                              tapeterminal.xcursor,
                              0,
                              cleantext,
                            )
                          }
                        })
                    } else {
                      resettoend()
                    }
                    break
                  case 'x':
                    if (inputstateactive && ispresent(withclipboard())) {
                      void withclipboard()
                        ?.writeText(inputstateselected)
                        .then(() => deleteselection())
                    } else {
                      resettoend()
                    }
                    break
                }
              } else if (mods.alt) {
                // no-op ?? - could this shove text around when you have selection ??
                // or jump by 10 or by word ??
              } else if (event.key.length === 1) {
                if (
                  inputstateactive &&
                  tapeterminal.xcursor <= inputstate.length
                ) {
                  if (hasselection) {
                    inputstatesetsplice(ii1, iic, event.key)
                    useTerminal.setState({ xselect: undefined })
                  } else {
                    inputstatesetsplice(tapeterminal.xcursor, 0, event.key)
                  }
                } else {
                  resettoend()
                }
                useTape.setState({
                  autocompleteindex: event.key === ' ' ? -1 : 0,
                })
              }
              break
          }
        }}
      />
    </>
  )
}
