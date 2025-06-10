import { useEffect } from 'react'
import {
  api_error,
  register_t9words,
  register_terminal_close,
  register_terminal_inclayout,
  vm_cli,
  vm_loader,
} from 'zss/device/api'
import { registerreadplayer, writehistorybuffer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { checkforword } from 'zss/feature/t9'
import { useTape, useTapeTerminal } from 'zss/gadget/data/state'
import { Scrollable } from 'zss/gadget/scrollable'
import { UserInput, modsfromevent } from 'zss/gadget/userinput'
import { withclipboard } from 'zss/mapping/keyboard'
import { clamp } from 'zss/mapping/number'
import { stringsplice } from 'zss/mapping/string'
import { isarray, ispresent, isstring } from 'zss/mapping/types'
import {
  applycolortoindexes,
  applystrtoindex,
  textformatreadedges,
  tokenizeandwritetextformat,
  writeplaintext,
} from 'zss/words/textformat'
import { COLOR, NAME } from 'zss/words/types'

import { useBlink, useWriteText } from '../hooks'
import { bgcolor, setuplogitem } from '../tape/common'

type TapeTerminalInputProps = {
  tapeycursor: number
  logrowtotalheight: number
}

export function TapeTerminalInput({
  tapeycursor,
  logrowtotalheight,
}: TapeTerminalInputProps) {
  const blink = useBlink()
  const context = useWriteText()
  const { quickterminal } = useTape()
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
  function inputstatesetsplice(index: number, count: number, insert?: string) {
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
  }

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

  function resettoend() {
    useTapeTerminal.setState({
      xcursor: inputstate.length,
      ycursor: 0,
      xselect: undefined,
      yselect: undefined,
    })
  }

  // eval for t9 / alt keys
  const maybechar = checkforword(inputstate, tapeterminal.xcursor)
  if (isstring(maybechar)) {
    inputstatesetsplice(tapeterminal.xcursor - 2, 2, maybechar)
  }
  if (isarray(maybechar)) {
    register_t9words(SOFTWARE, player, maybechar)
  }

  // reset color & bg
  context.reset.bg = bgcolor(quickterminal)

  if (!quickterminal) {
    // write hint
    setuplogitem(false, false, 0, 0, context)
    const hint = `${import.meta.env.ZSS_BRANCH_NAME}:${import.meta.env.ZSS_BRANCH_VERSION} - if lost try #help`
    context.x = 1
    tokenizeandwritetextformat(`$dkcyan${hint}`, context, true)
  }

  // draw divider
  const de = '$196'
  const dc = '$205'
  const dm = dc.repeat(edge.width - 6)
  setuplogitem(false, false, 0, edge.height - 2, context)
  context.active.color = COLOR.WHITE
  tokenizeandwritetextformat(`  ${de}${dm}${de}  `, context, true)

  // draw input line
  const inputline = inputstate.padEnd(edge.width, ' ')
  setuplogitem(false, false, 0, edge.height - 1, context)
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
    const idx = x + y * context.width
    applystrtoindex(idx, String.fromCharCode(221), context)
    applycolortoindexes(idx, idx, 15, context.reset.bg, context)
  }

  useEffect(() => {
    let scroll = tapeterminal.scroll
    if (tapeycursor < 4) {
      scroll++
    }
    if (tapeycursor > edge.bottom - 4) {
      scroll--
    }
    useTapeTerminal.setState({
      scroll: Math.round(clamp(scroll, 0, logrowtotalheight)),
    })
  }, [tapeterminal.scroll, tapeycursor, logrowtotalheight, edge.bottom])

  return (
    <>
      <Scrollable
        blocking
        x={edge.left}
        y={edge.top}
        width={edge.width}
        height={edge.height}
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
                  const historybuffer: string[] = [
                    '',
                    invoke,
                    ...tapeterminal.buffer
                      .slice(1)
                      .filter((item) => item !== invoke),
                  ]
                  // cache history
                  writehistorybuffer(historybuffer).catch((err) =>
                    api_error(SOFTWARE, player, 'input?', err.message),
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
              } else if (key.length === 1) {
                if (
                  inputstateactive &&
                  tapeterminal.xcursor <= inputstate.length
                ) {
                  if (hasselection) {
                    inputstatesetsplice(ii1, iic, key)
                    useTapeTerminal.setState({ xselect: undefined })
                  } else {
                    inputstatesetsplice(tapeterminal.xcursor, 0, key)
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
