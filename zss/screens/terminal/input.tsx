import { useEffect, useMemo } from 'react'
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
import { useBlink, useWriteText } from 'zss/gadget/hooks'
import { Scrollable } from 'zss/gadget/scrollable'
import { UserInput, modsfromevent } from 'zss/gadget/userinput'
import { clamp } from 'zss/mapping/number'
import { MAYBE, ispresent, isstring } from 'zss/mapping/types'
import {
  EMPTY_AUTOCOMPLETE,
  drawautocomplete,
  getautocomplete,
} from 'zss/screens/tape/autocomplete'
import { bgcolor, setuplogitem } from 'zss/screens/tape/common'
import {
  textformatreadedges,
  tokenizeandmeasuretextformat,
  tokenizeandwritetextformat,
  writeplaintext,
} from 'zss/words/textformat'
import { COLOR, NAME } from 'zss/words/types'
import { useShallow } from 'zustand/react/shallow'

import { applycodetokencolors, buildzsswordcolors } from '../tape/colors'

import {
  computeterminalselection,
  drawterminalcursor,
  drawterminalselection,
  inputstateswitch,
  tokenizeline,
  trackselection,
} from './terminalinputhelpers'
import {
  useTerminalResetToEnd,
  useTerminalSplice,
  useTerminalYCursor,
} from './terminalinputhooks'

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
  const blink = useBlink()
  const context = useWriteText()
  const tapeterminal = useTerminal()
  const [editoropen] = useTape(useShallow((state) => [state.editor.open]))

  // autocomplete and hints state
  const autocompleteindex = useTape((state) => state.autocompleteindex)
  const autocompleteactive = autocompleteindex >= 0
  const argslookup = useTape((state) => state.argslookup)

  const player = registerreadplayer()
  const edge = textformatreadedges(context)

  const inputstate = tapeterminal.buffer[tapeterminal.bufferindex]
  const inputstateactive = tapeterminal.ycursor === 0
  const inputlinetokens = useMemo(() => tokenizeline(inputstate), [inputstate])

  // --- selection ---

  const { ii1, iic, hasselection, inputstateselected } =
    computeterminalselection(
      tapeterminal.xcursor,
      tapeterminal.xselect,
      tapeterminal.yselect,
      inputstate,
    )

  // --- hooks ---

  const { inputstatesetsplice, inputstatereplace } = useTerminalSplice(
    inputstate,
    tapeterminal.buffer,
    tapeterminal.bufferindex,
  )

  const visiblerows = edge.bottom - edge.top - (editoropen ? 0 : 2)
  const inputstateycursor = useTerminalYCursor(logrowtotalheight, visiblerows)
  const resettoend = useTerminalResetToEnd(inputstate.length)

  // --- autocomplete ---

  const zsswords = useGadgetClient((state) => state.zsswords)
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
  }

  // --- inline helpers ---

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

  // --- drawing ---

  context.reset.bg = bgcolor(quickterminal)

  if (!quickterminal) {
    setuplogitem(false, 0, 0, context)
    const hint = `$DKCYAN${import.meta.env.ZSS_BRANCH_NAME}:${import.meta.env.ZSS_BRANCH_VERSION} ${import.meta.env.ZSS_COMMIT_MESSAGE}`
    const measured = tokenizeandmeasuretextformat(hint, edge.width, 1)
    context.x = edge.width - (measured?.measuredwidth ?? 0) - 1
    tokenizeandwritetextformat(hint, context, true)
  }

  const de = '$196'
  const dc = '$205'
  const dm = dc.repeat(edge.width - 6)
  setuplogitem(false, 0, edge.height - 2, context)
  context.active.color = COLOR.WHITE
  tokenizeandwritetextformat(`  ${de}${dm}${de}  `, context, true)

  setuplogitem(false, 0, edge.height - 1, context)
  const yoffset = context.y * context.width
  const inputline = inputstate.padEnd(edge.width, ' ')

  context.active.color = COLOR.WHITE
  writeplaintext(inputline, context, true)

  // apply token colors
  applycodetokencolors(0, yoffset, edge.width, inputlinetokens, context)

  drawterminalselection(
    tapeterminal.xcursor,
    tapeterminal.ycursor,
    tapeterminal.xselect,
    tapeterminal.yselect,
    context,
  )

  drawterminalcursor(blink, tapeterminal.xcursor, tapeycursor, context)

  if (autocompleteactive && autocomplete.suggestions.length > 0) {
    const startx = edge.left + autocomplete.wordcol - 1
    const starty = edge.top + edge.height - 1
    drawautocomplete(
      autocomplete,
      autocompleteindex,
      startx,
      starty,
      edge,
      context,
      zsswords,
      true,
    )
  }

  // --- speech to text ---

  useEffect(() => {
    let listener: MAYBE<SpeechToText>

    if (!voice2text || !quickterminal) {
      return
    }

    const { buffer, bufferindex } = useTerminal.getState()
    const inputstart = buffer[bufferindex]

    if (inputstart !== '') {
      return
    }

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

    try {
      const speechlistener = new SpeechToText(
        onFinalised,
        onEndEvent,
        onAnythingSaid,
      )
      listener = speechlistener
      listener?.startListening()
    } catch (error: any) {
      console.error(error.message)
    }

    return () => {
      listener?.stopListening()
      listener = undefined
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
            useTerminal.setState({
              xcursor: 0,
            })
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
                  case 'a':
                    useTerminal.setState({
                      xselect: 0,
                      yselect: 0,
                      xcursor: inputstate.length,
                      ycursor: 0,
                    })
                    break
                  case 'c':
                    if (inputstateactive && ispresent(withclipboard())) {
                      void withclipboard().writeText(inputstateselected)
                    } else {
                      resettoend()
                    }
                    break
                  case 'v':
                    if (inputstateactive && ispresent(withclipboard())) {
                      withclipboard()
                        .readText()
                        .then((text) => {
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
                          } catch (err) {
                            console.error(err)
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
                        .catch((err) => console.error(err))
                    } else {
                      resettoend()
                    }
                    break
                  case 'x':
                    if (inputstateactive && ispresent(withclipboard())) {
                      void withclipboard()
                        .writeText(inputstateselected)
                        .then(() => deleteselection())
                    } else {
                      resettoend()
                    }
                    break
                }
              } else if (mods.alt) {
                // reserved for future use
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
