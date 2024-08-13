import {
  tape_terminal_close,
  tape_terminal_inclayout,
  vm_cli,
} from 'zss/device/api'
import { gadgetstategetplayer } from 'zss/device/gadgetclient'
import {
  applycolortoindexes,
  applystrtoindex,
  textformatreadedges,
  tokenizeandwritetextformat,
  useWriteText,
} from 'zss/gadget/data/textformat'
import { clamp } from 'zss/mapping/number'
import { stringsplice } from 'zss/mapping/string'
import { ispresent } from 'zss/mapping/types'

import { useBlink } from '../../useblink'
import { UserInput, modsfromevent } from '../../userinput'
import { BG, FG, setuplogitem, tapeinputstate, useTapeInput } from '../common'

type ConsoleInputProps = {
  tapeycursor: number
  logrowtotalheight: number
}

export function TerminalInput({
  tapeycursor,
  logrowtotalheight,
}: ConsoleInputProps) {
  const blink = useBlink()
  const context = useWriteText()
  const tapeinput = useTapeInput()
  const edge = textformatreadedges(context)

  // input & selection
  const inputstate = tapeinput.buffer[tapeinput.bufferindex]

  // local x input
  const rightedge = edge.right - 1

  let ii1 = tapeinput.xcursor
  let ii2 = tapeinput.xcursor
  let hasselection = false

  // adjust input edges selection
  if (ispresent(tapeinput.xselect) && ispresent(tapeinput.yselect)) {
    hasselection = true
    ii1 = Math.min(tapeinput.xcursor, tapeinput.xselect)
    ii2 = Math.max(tapeinput.xcursor, tapeinput.xselect)
    if (tapeinput.xcursor !== tapeinput.xselect) {
      // tuck in right side
      --ii2
    }
  }

  const iic = ii2 - ii1 + 1
  const inputstateactive = tapeinput.ycursor === 0
  const inputstateselected = hasselection
    ? inputstate.substring(ii1, ii2 + 1)
    : inputstate

  // update state
  function inputstatesetsplice(index: number, count: number, insert?: string) {
    // we are trying to modify historical entries
    if (tapeinput.bufferindex > 0) {
      // blank inputslot and snap index to 0
      tapeinputstate.bufferindex = 0
    }
    // write state
    tapeinputstate.buffer[0] = stringsplice(inputstate, index, count, insert)
    // clear selection
    tapeinputstate.xselect = undefined
    tapeinputstate.xcursor = index + (insert ?? '').length
  }

  // navigate input history
  function inputstateswitch(switchto: number) {
    const ir = tapeinput.buffer.length - 1
    const index = clamp(switchto, 0, ir)
    tapeinputstate.bufferindex = index
    tapeinputstate.xcursor = tapeinputstate.buffer[index].length
    tapeinputstate.ycursor = 0
    tapeinputstate.xselect = undefined
    tapeinputstate.yselect = undefined
  }

  // track selection
  function trackselection(active: boolean) {
    if (active) {
      if (!ispresent(tapeinput.xselect)) {
        tapeinputstate.xselect = tapeinput.xcursor
        tapeinputstate.yselect = tapeinput.ycursor
      }
    } else {
      tapeinputstate.xselect = undefined
      tapeinputstate.yselect = undefined
    }
  }

  function deleteselection() {
    if (ispresent(tapeinputstate.xselect)) {
      tapeinputstate.xcursor = ii1
      tapeinputstate.xselect = undefined
      tapeinputstate.yselect = undefined
      inputstatesetsplice(ii1, iic)
    }
  }

  function resettoend() {
    tapeinputstate.xcursor = inputstate.length
    tapeinputstate.ycursor = 0
    tapeinputstate.xselect = undefined
    tapeinputstate.yselect = undefined
  }

  // draw divider
  const de = '$196'
  const dc = '$205'
  const dm = dc.repeat(edge.width - 6)
  setuplogitem(false, false, edge.bottom - 2, context)
  tokenizeandwritetextformat(`  ${de}${dm}${de}  `, context, true)

  // draw input line
  const inputline = inputstate.padEnd(edge.width, ' ')
  const in1 = (edge.bottom - 1) * edge.width
  const in2 = in1 + edge.width
  context.y = edge.bottom
  applystrtoindex(in1, inputline, context)
  applycolortoindexes(in1, in2, FG, BG, context)

  // draw selection
  if (
    ispresent(tapeinput.xselect) &&
    ispresent(tapeinput.yselect) &&
    tapeinput.xcursor !== tapeinput.xselect
  ) {
    // top - left
    const x1 = Math.min(tapeinput.xcursor, tapeinput.xselect)
    const y1 = Math.min(tapeinput.ycursor, tapeinput.yselect)
    // bottom - right
    const x2 = Math.max(tapeinput.xcursor, tapeinput.xselect) - 1
    const y2 = Math.max(tapeinput.ycursor, tapeinput.yselect)
    // write colors
    for (let iy = y1; iy <= y2; ++iy) {
      const p1 = x1 + (edge.bottom - iy) * edge.width
      const p2 = x2 + (edge.bottom - iy) * edge.width
      applycolortoindexes(p1, p2, 15, 8, context)
    }
  }

  // apply bg blink

  // draw cursor
  if (blink) {
    applystrtoindex(
      tapeinput.xcursor + tapeycursor * edge.width,
      String.fromCharCode(221),
      context,
    )
  }

  return (
    <>
      <UserInput
        MENU_BUTTON={(mods) => tape_terminal_inclayout('tape', !mods.shift)}
        MOVE_UP={(mods) => {
          if (mods.ctrl) {
            inputstateswitch(tapeinput.bufferindex + 1)
          } else {
            trackselection(mods.shift)
            tapeinputstate.ycursor = clamp(
              tapeinput.ycursor + (mods.alt ? 10 : 1),
              0,
              logrowtotalheight,
            )
          }
        }}
        MOVE_DOWN={(mods) => {
          if (mods.ctrl) {
            inputstateswitch(tapeinput.bufferindex - 1)
          } else {
            trackselection(mods.shift)
            tapeinputstate.ycursor = clamp(
              tapeinput.ycursor - (mods.alt ? 10 : 1),
              0,
              logrowtotalheight,
            )
          }
        }}
        MOVE_LEFT={(mods) => {
          trackselection(mods.shift)
          if (mods.ctrl) {
            tapeinputstate.xcursor = 0
          } else {
            tapeinputstate.xcursor = clamp(
              tapeinput.xcursor - (mods.alt ? 10 : 1),
              0,
              rightedge,
            )
          }
        }}
        MOVE_RIGHT={(mods) => {
          trackselection(mods.shift)
          if (mods.ctrl) {
            tapeinputstate.xcursor = inputstateactive
              ? inputstate.length
              : rightedge
          } else {
            tapeinputstate.xcursor = clamp(
              tapeinput.xcursor + (mods.alt ? 10 : 1),
              0,
              rightedge,
            )
          }
        }}
        OK_BUTTON={() => {
          const invoke = hasselection ? inputstateselected : inputstate
          if (invoke.length) {
            if (inputstateactive) {
              tapeinputstate.xcursor = 0
              tapeinputstate.bufferindex = 0
              tapeinputstate.xselect = undefined
              tapeinputstate.yselect = undefined
              tapeinputstate.buffer = [
                '',
                invoke,
                ...tapeinput.buffer.slice(1).filter((item) => item !== invoke),
              ]
              vm_cli('tape', invoke, gadgetstategetplayer())
            } else {
              resettoend()
            }
          }
        }}
        CANCEL_BUTTON={() => {
          tape_terminal_close('tape')
        }}
        keydown={(event) => {
          const { key } = event
          const lkey = key.toLowerCase()
          const mods = modsfromevent(event)

          switch (lkey) {
            case 'delete':
              // single line only
              if (inputstateactive) {
                if (hasselection) {
                  deleteselection()
                } else if (inputstate.length > 0) {
                  inputstatesetsplice(tapeinput.xcursor, 1)
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
                } else if (tapeinput.xcursor > 0) {
                  inputstatesetsplice(tapeinput.xcursor - 1, 1)
                }
              } else {
                resettoend()
              }
              break
            default:
              if (mods.ctrl) {
                switch (lkey) {
                  case 'a':
                    // start
                    tapeinputstate.xselect = 0
                    tapeinputstate.yselect = 0
                    // end
                    tapeinputstate.xcursor = inputstate.length
                    tapeinputstate.ycursor = 0
                    break
                  case 'c':
                    // can support multiline ?
                    if (inputstateactive && ispresent(navigator.clipboard)) {
                      navigator.clipboard
                        .writeText(inputstateselected)
                        .catch((err) => console.error(err))
                    } else {
                      resettoend()
                    }
                    break
                  case 'v':
                    if (inputstateactive && ispresent(navigator.clipboard)) {
                      navigator.clipboard
                        .readText()
                        .then((text) => {
                          const cleantext = text.replaceAll('\r', '')
                          if (hasselection) {
                            inputstatesetsplice(ii1, iic, cleantext)
                          } else {
                            inputstatesetsplice(tapeinput.xcursor, 0, cleantext)
                          }
                        })
                        .catch((err) => console.error(err))
                    } else {
                      resettoend()
                    }
                    break
                  case 'x':
                    if (inputstateactive && ispresent(navigator.clipboard)) {
                      navigator.clipboard
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
                  tapeinput.xcursor <= inputstate.length
                ) {
                  if (hasselection) {
                    inputstatesetsplice(ii1, iic, key)
                    tapeinputstate.xselect = undefined
                  } else {
                    inputstatesetsplice(tapeinput.xcursor, 0, key)
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
