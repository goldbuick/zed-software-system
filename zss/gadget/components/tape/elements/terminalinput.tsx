import {
  tape_terminal_close,
  tape_terminal_inclayout,
  vm_cli,
} from 'zss/device/api'
import { gadgetstategetplayer } from 'zss/device/gadgetclient'
import { Scrollable } from 'zss/gadget/components/scrollable'
import { useBlink } from 'zss/gadget/components/useblink'
import { UserInput, modsfromevent } from 'zss/gadget/components/userinput'
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

import { setuplogitem, tapeterminalstate, useTapeTerminal } from '../common'

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
  const tapeinput = useTapeTerminal()
  const edge = textformatreadedges(context)

  // input & selection
  const inputstate = tapeinput.buffer[tapeinput.bufferindex]

  // local x input
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
      tapeterminalstate.bufferindex = 0
    }
    // write state
    tapeterminalstate.buffer[0] = stringsplice(inputstate, index, count, insert)
    // clear selection
    tapeterminalstate.xselect = undefined
    tapeterminalstate.xcursor = index + (insert ?? '').length
  }

  // navigate input history
  function inputstateswitch(switchto: number) {
    const ir = tapeinput.buffer.length - 1
    const index = clamp(switchto, 0, ir)
    tapeterminalstate.bufferindex = index
    tapeterminalstate.xcursor = tapeterminalstate.buffer[index].length
    tapeterminalstate.ycursor = 0
    tapeterminalstate.xselect = undefined
    tapeterminalstate.yselect = undefined
  }

  // track selection
  function trackselection(active: boolean) {
    if (active) {
      if (!ispresent(tapeinput.xselect)) {
        tapeterminalstate.xselect = tapeinput.xcursor
        tapeterminalstate.yselect = tapeinput.ycursor
      }
    } else {
      tapeterminalstate.xselect = undefined
      tapeterminalstate.yselect = undefined
    }
  }

  function deleteselection() {
    if (ispresent(tapeterminalstate.xselect)) {
      tapeterminalstate.xcursor = ii1
      tapeterminalstate.xselect = undefined
      tapeterminalstate.yselect = undefined
      inputstatesetsplice(ii1, iic)
    }
  }

  function resettoend() {
    tapeterminalstate.xcursor = inputstate.length
    tapeterminalstate.ycursor = 0
    tapeterminalstate.xselect = undefined
    tapeterminalstate.yselect = undefined
  }

  // write hint
  setuplogitem(false, false, 0, 0, context)
  const hint = 'if lost try #help'
  context.x = edge.right - hint.length
  tokenizeandwritetextformat(`$dkcyan${hint}`, context, true)

  // draw divider
  const de = '$196'
  const dc = '$205'
  const dm = dc.repeat(edge.width - 6)
  setuplogitem(false, false, 0, edge.height - 2, context)
  tokenizeandwritetextformat(`  ${de}${dm}${de}  `, context, true)

  // draw input line
  const inputline = inputstate.padEnd(edge.width, ' ')
  setuplogitem(false, false, 0, edge.height - 1, context)
  tokenizeandwritetextformat(inputline, context, true)

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

  // draw cursor
  if (blink) {
    const x = edge.left + tapeinput.xcursor
    const y = edge.top + tapeycursor
    applystrtoindex(x + y * context.width, String.fromCharCode(221), context)
  }

  return (
    <>
      <Scrollable
        blocking
        x={edge.left}
        y={edge.top}
        width={edge.width}
        height={edge.height}
        onScroll={(deltay) => {
          trackselection(false)
          tapeterminalstate.ycursor = clamp(
            Math.round(tapeinput.ycursor - deltay),
            0,
            logrowtotalheight,
          )
        }}
      />
      <UserInput
        MENU_BUTTON={(mods) => tape_terminal_inclayout('tape', !mods.shift)}
        MOVE_UP={(mods) => {
          if (mods.ctrl) {
            inputstateswitch(tapeinput.bufferindex + 1)
          } else {
            trackselection(mods.shift)
            tapeterminalstate.ycursor = clamp(
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
            tapeterminalstate.ycursor = clamp(
              tapeinput.ycursor - (mods.alt ? 10 : 1),
              0,
              logrowtotalheight,
            )
          }
        }}
        MOVE_LEFT={(mods) => {
          trackselection(mods.shift)
          if (mods.ctrl) {
            tapeterminalstate.xcursor = 0
          } else {
            tapeterminalstate.xcursor = clamp(
              tapeinput.xcursor - (mods.alt ? 10 : 1),
              0,
              edge.right,
            )
          }
        }}
        MOVE_RIGHT={(mods) => {
          trackselection(mods.shift)
          if (mods.ctrl) {
            tapeterminalstate.xcursor = inputstateactive
              ? inputstate.length
              : edge.right
          } else {
            tapeterminalstate.xcursor = clamp(
              tapeinput.xcursor + (mods.alt ? 10 : 1),
              0,
              edge.right,
            )
          }
        }}
        OK_BUTTON={() => {
          const invoke = hasselection ? inputstateselected : inputstate
          if (invoke.length) {
            if (inputstateactive) {
              tapeterminalstate.xcursor = 0
              tapeterminalstate.bufferindex = 0
              tapeterminalstate.xselect = undefined
              tapeterminalstate.yselect = undefined
              tapeterminalstate.buffer = [
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
                    tapeterminalstate.xselect = 0
                    tapeterminalstate.yselect = 0
                    // end
                    tapeterminalstate.xcursor = inputstate.length
                    tapeterminalstate.ycursor = 0
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
                    tapeterminalstate.xselect = undefined
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
