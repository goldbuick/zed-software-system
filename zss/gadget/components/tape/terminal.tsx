import { useSnapshot } from 'valtio'
import { tape_close, tape_incdisplay, vm_cli } from 'zss/device/api'
import { gadgetstategetplayer } from 'zss/device/gadgetclient'
import { useTape } from 'zss/device/tape'
import {
  WRITE_TEXT_CONTEXT,
  tokenizeandmeasuretextformat,
} from 'zss/gadget/data/textformat'
import { clamp } from 'zss/mapping/number'
import { stringsplice } from 'zss/mapping/string'
import { ispresent } from 'zss/mapping/types'

import { UserHotkey, UserInput, UserInputMods, ismac } from '../userinput'

import { tapeinputstate } from './common'
import { Logput } from './logput'

type TapeConsoleTerminalProps = {
  width: number
  height: number
  context: WRITE_TEXT_CONTEXT
}

export function TapeConsoleTerminal({
  width,
  height,
  context,
}: TapeConsoleTerminalProps) {
  const tape = useTape()
  const tapeinput = useSnapshot(tapeinputstate)

  // offset into logs
  const centerrow = Math.round(tapeinput.ycursor - height * 0.5)
  const maxrowheight = height - 2
  const startrow = clamp(centerrow, 0, tape.logs.length - maxrowheight)

  // starting render row
  const logput = tape.logs.slice(startrow, startrow + maxrowheight)

  // build id list
  // const logids: string[] = logput.map((item) => item[0])

  // render to strings
  const logrows: string[] = logput.map((item) => {
    const [, maybelevel, source, ...message] = item
    let level = '$white'
    switch (maybelevel) {
      case 'debug':
        level = '$yellow'
        break
      case 'error':
        level = '$red'
        break
    }

    const messagetext = message.map((v) => `${v}`).join(' ')
    const ishyperlink = messagetext.startsWith('!')
    const prefix = `$blue[${level}${source}$blue]`
    return `${ishyperlink ? '!' : ''}${prefix} ${messagetext}`
  })

  // measure rows
  context.y = 0
  const logoffsets: number[] = logrows.map((item) => {
    let y = -context.y
    if (item.startsWith('!')) {
      context.y += 1
    } else {
      const measure = tokenizeandmeasuretextformat(item, width, height)
      const step = measure?.y ?? 1
      context.y += step
      y -= step - 1
    }
    return y
  })

  // input & selection
  const inputstate = tapeinput.buffer[tapeinput.bufferindex]

  // local x input
  const rightedge = width - 1
  const lastrow = tape.logs.length + 1

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

  return (
    <>
      <UserHotkey hotkey="Escape">{() => tape_close('tape')}</UserHotkey>
      <Logput
        player={gadgetstategetplayer()}
        rows={logrows}
        offsets={logoffsets}
        startrow={startrow}
        context={context}
      />
      <UserInput
        MENU_BUTTON={(mods) => tape_incdisplay('tape', mods.shift ? -1 : 1)}
        MOVE_UP={(mods) => {
          if (mods.ctrl) {
            inputstateswitch(tapeinput.bufferindex + 1)
          } else {
            trackselection(mods.shift)
            tapeinputstate.ycursor = clamp(
              tapeinput.ycursor + (mods.alt ? 10 : 1),
              0,
              lastrow,
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
              lastrow,
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
        keydown={(event) => {
          const { key } = event
          const lkey = key.toLowerCase()
          const mods: UserInputMods = {
            alt: event.altKey,
            ctrl: ismac ? event.metaKey : event.ctrlKey,
            shift: event.shiftKey,
          }

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
                          if (hasselection) {
                            inputstatesetsplice(ii1, iic, text)
                          } else {
                            inputstatesetsplice(tapeinput.xcursor, 0, text)
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