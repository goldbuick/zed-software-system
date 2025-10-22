import { useCallback, useEffect, useLayoutEffect } from 'react'
import {
  api_error,
  register_terminal_close,
  register_terminal_inclayout,
  vm_cli,
  vm_clirepeatlast,
  vm_loader,
} from 'zss/device/api'
import { registerreadplayer, writehistorybuffer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { withclipboard } from 'zss/feature/keyboard'
import { SpeechToText } from 'zss/feature/speechtotext'
import { useTapeTerminal } from 'zss/gadget/data/state'
import { useBlink, useWriteText } from 'zss/gadget/hooks'
import { Scrollable } from 'zss/gadget/scrollable'
import { UserInput, modsfromevent } from 'zss/gadget/userinput'
import { clamp } from 'zss/mapping/number'
import { stringsplice } from 'zss/mapping/string'
import { MAYBE, ispresent, isstring } from 'zss/mapping/types'
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

type TapeTerminalInputProps = {
  quickterminal: boolean
  voice2text: boolean
  tapeycursor: number
  logrowtotalheight: number
}

export function TapeTerminalInput({
  quickterminal,
  voice2text,
  tapeycursor,
  logrowtotalheight,
}: TapeTerminalInputProps) {
  const blink = useBlink()
  const context = useWriteText()
  const tapeterminal = useTapeTerminal()
  const player = registerreadplayer()
  const edge = textformatreadedges(context)

  // input & selection
  const inputstate = tapeterminal.buffer[tapeterminal.bufferindex]

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
        useTapeTerminal.setState({ bufferindex: 0 })
      }
      // write state
      tapeterminal.buffer[0] = stringsplice(inputstate, index, count, insert)
      useTapeTerminal.setState({
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
        useTapeTerminal.setState({ bufferindex: 0 })
      }
      // write state
      tapeterminal.buffer[0] = replacewith
      useTapeTerminal.setState({
        buffer: tapeterminal.buffer,
        // clear selection
        xselect: undefined,
        xcursor: replacewith.length,
      })
    },
    [tapeterminal.buffer, tapeterminal.bufferindex],
  )

  // navigate input history
  function inputstateswitch(switchto: number) {
    const ir = tapeterminal.buffer.length - 1
    const index = clamp(switchto, 0, ir)
    useTapeTerminal.setState({
      bufferindex: index,
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
        useTapeTerminal.setState({
          xselect: tapeterminal.xcursor,
          yselect: tapeterminal.ycursor,
        })
      }
    } else {
      useTapeTerminal.setState({
        xselect: undefined,
        yselect: undefined,
      })
    }
  }

  function deleteselection() {
    if (ispresent(tapeterminal.xselect)) {
      useTapeTerminal.setState({
        xcursor: ii1,
        xselect: undefined,
        yselect: undefined,
      })
      inputstatesetsplice(ii1, iic)
    }
  }

  const resettoend = useCallback(() => {
    useTapeTerminal.setState({
      scroll: 0,
      xcursor: inputstate.length,
      ycursor: 0,
      xselect: undefined,
      yselect: undefined,
    })
  }, [inputstate.length])

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
  if (blink) {
    const x = edge.left + tapeterminal.xcursor
    const y = edge.top + tapeycursor
    // visibility clip
    if (
      y >= edge.top &&
      y <= edge.bottom &&
      x >= edge.left &&
      x <= edge.right
    ) {
      const atchar = x + y * context.width
      applystrtoindex(atchar, String.fromCharCode(221), context)
      applycolortoindexes(
        atchar,
        atchar,
        COLOR.WHITE,
        context.reset.bg,
        context,
      )
    }
  }

  useEffect(() => {
    let listener: MAYBE<SpeechToText>

    // #config voice2text on, use # or C to open terminal to start
    if (!voice2text || !quickterminal) {
      return
    }

    // track starting input
    const { buffer, bufferindex } = useTapeTerminal.getState()
    const inputstart = buffer[bufferindex]

    if (inputstart.includes('#')) {
      return
    }

    // handlers
    function onFinalised(value: string) {
      inputstatereplace(`${inputstart}${value}`)
      setTimeout(() => {
        const { buffer, bufferindex } = useTapeTerminal.getState()
        const inputstate = buffer[bufferindex]
        const historybuffer: string[] = [
          '',
          inputstate,
          ...buffer.slice(1).filter((item) => item !== inputstate),
        ].filter((item) => item.includes('#broadcast') === false)
        // cache history
        writehistorybuffer(historybuffer).catch((err) =>
          api_error(SOFTWARE, player, 'terminalinput', err.message),
        )
        useTapeTerminal.setState({
          xcursor: 0,
          bufferindex: 0,
          xselect: undefined,
          yselect: undefined,
          buffer: historybuffer,
        })
        vm_cli(SOFTWARE, player, inputstate)
        register_terminal_close(SOFTWARE, player)
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
    } catch (error: any) {
      console.error(error.message)
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
          document.getElementById('touchtext')?.focus()
        }}
        onScroll={(deltay: number) => {
          trackselection(false)
          useTapeTerminal.setState({
            ycursor: clamp(
              Math.round(tapeterminal.ycursor - deltay),
              0,
              logrowtotalheight,
            ),
          })
        }}
      />
      <UserInput
        keydown={(event) => {
          const { key } = event
          const lkey = NAME(key)
          const mods = modsfromevent(event)
          switch (lkey) {
            case 'arrowleft':
              trackselection(mods.shift)
              if (mods.ctrl) {
                useTapeTerminal.setState({ xcursor: 0 })
              } else {
                useTapeTerminal.setState({
                  xcursor: clamp(
                    tapeterminal.xcursor - (mods.alt ? 10 : 1),
                    0,
                    edge.right,
                  ),
                })
              }
              break
            case 'arrowright':
              trackselection(mods.shift)
              if (mods.ctrl) {
                useTapeTerminal.setState({
                  xcursor: inputstateactive ? inputstate.length : edge.right,
                })
              } else {
                useTapeTerminal.setState({
                  xcursor: clamp(
                    tapeterminal.xcursor + (mods.alt ? 10 : 1),
                    0,
                    edge.right,
                  ),
                })
              }
              break
            case 'arrowup':
              if (mods.ctrl) {
                inputstateswitch(tapeterminal.bufferindex + 1)
              } else {
                trackselection(mods.shift)
                useTapeTerminal.setState({
                  ycursor: clamp(
                    Math.round(tapeterminal.ycursor + (mods.alt ? 10 : 1)),
                    0,
                    logrowtotalheight,
                  ),
                })
              }
              break
            case 'arrowdown':
              if (mods.ctrl) {
                inputstateswitch(tapeterminal.bufferindex - 1)
              } else {
                trackselection(mods.shift)
                useTapeTerminal.setState({
                  ycursor: clamp(
                    Math.round(tapeterminal.ycursor - (mods.alt ? 10 : 1)),
                    0,
                    logrowtotalheight,
                  ),
                })
              }
              break
            case 'enter': {
              const invoke = hasselection ? inputstateselected : inputstate
              if (invoke.length) {
                if (inputstateactive) {
                  const { buffer } = useTapeTerminal.getState()
                  const historybuffer: string[] = [
                    '',
                    invoke,
                    ...buffer.slice(1).filter((item) => item !== invoke),
                  ].filter((item) => item.includes('#broadcast') === false)
                  // cache history
                  writehistorybuffer(historybuffer).catch((err) =>
                    api_error(SOFTWARE, player, 'terminalinput', err.message),
                  )
                  useTapeTerminal.setState({
                    xcursor: 0,
                    bufferindex: 0,
                    xselect: undefined,
                    yselect: undefined,
                    buffer: historybuffer,
                  })
                  vm_cli(SOFTWARE, player, invoke)
                  if (quickterminal) {
                    register_terminal_close(SOFTWARE, player)
                  }
                } else {
                  resettoend()
                }
              }
              break
            }
            case 'esc':
            case 'escape':
              register_terminal_close(SOFTWARE, player)
              break
            case 'tab':
              register_terminal_inclayout(SOFTWARE, player, !mods.shift)
              break
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
              break
            default:
              if (mods.ctrl) {
                switch (lkey) {
                  case 'e':
                    vm_cli(SOFTWARE, player, '#export')
                    break
                  case 'p':
                    vm_clirepeatlast(SOFTWARE, player)
                    break
                  case 'a':
                    useTapeTerminal.setState({
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
                      withclipboard()
                        .writeText(inputstateselected)
                        .catch((err) => console.error(err))
                    } else {
                      resettoend()
                    }
                    break
                  case 'v':
                    if (inputstateactive && ispresent(withclipboard())) {
                      withclipboard()
                        .readText()
                        .then((text) => {
                          // did we paste json ??
                          try {
                            const json = JSON.parse(text)
                            if (
                              isstring(json.exported) &&
                              ispresent(json.data)
                            ) {
                              vm_loader(
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
                      withclipboard()
                        .writeText(inputstateselected)
                        .then(() => deleteselection())
                        .catch((err) => console.error(err))
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
                    useTapeTerminal.setState({ xselect: undefined })
                  } else {
                    inputstatesetsplice(tapeterminal.xcursor, 0, event.key)
                  }
                } else {
                  resettoend()
                }
              }
              break
          }
        }}
      />
    </>
  )
}
