import { useThree } from '@react-three/fiber'
import { proxy, useSnapshot } from 'valtio'
import { vm_cli } from 'zss/device/api'
import { gadgetstategetplayer } from 'zss/device/gadgetclient'
import {
  TAPE_DISPLAY,
  tapesetmode,
  tapesetopen,
  useTape,
} from 'zss/device/tape'
import {
  WRITE_TEXT_CONTEXT,
  createwritetextcontext,
  tokenizeandwritetextformat,
  tokenizeandmeasuretextformat,
  applystrtoindex,
  applycolortoindexes,
} from 'zss/gadget/data/textformat'
import { COLOR, DRAW_CHAR_HEIGHT, DRAW_CHAR_WIDTH } from 'zss/gadget/data/types'
import { clamp } from 'zss/mapping/number'
import { stringsplice } from 'zss/mapping/string'
import { MAYBE_NUMBER, ispresent, isstring } from 'zss/mapping/types'

import { useBlink } from './panel/common'
import {
  UserFocus,
  UserHotkey,
  UserInput,
  UserInputMods,
  isMac,
} from './userinput'
import { TileSnapshot, resetTiles, useTiles } from './usetiles'

const SCALE = 1
const FG = COLOR.BLUE
const BG = COLOR.DKBLUE
const CHAR_WIDTH = DRAW_CHAR_WIDTH * SCALE
const CHAR_HEIGHT = DRAW_CHAR_HEIGHT * SCALE

const tapeinputstate = proxy({
  cursor: 0,
  bufferindex: 0,
  buffer: [''],
  selection: undefined as MAYBE_NUMBER,
})

export function TapeConsole() {
  const viewport = useThree((state) => state.viewport)
  const { width: viewWidth, height: viewHeight } = viewport.getCurrentViewport()

  const tape = useTape()
  const tapeinput = useSnapshot(tapeinputstate)

  const cols = Math.floor(viewWidth / CHAR_WIDTH)
  const rows = Math.floor(viewHeight / CHAR_HEIGHT)
  const marginX = viewWidth - cols * CHAR_WIDTH
  const marginY = viewHeight - rows * CHAR_HEIGHT

  let top = 0
  let left = 0
  let width = cols
  let height = rows

  switch (tape.mode) {
    case TAPE_DISPLAY.TOP:
      height = Math.round(rows * 0.5)
      break
    case TAPE_DISPLAY.RIGHT:
      width = Math.round(cols * 0.5)
      left = (cols - width) * CHAR_WIDTH
      break
    case TAPE_DISPLAY.BOTTOM:
      height = Math.round(rows * 0.5)
      top = (rows - height) * CHAR_HEIGHT
      break
    case TAPE_DISPLAY.LEFT:
      width = Math.round(cols * 0.5)
      break
    default:
    case TAPE_DISPLAY.FULL:
      // defaults
      break
  }

  const tiles = useTiles(width, height, 0, FG, BG)

  resetTiles(tiles, 250, FG, BG)
  const context: WRITE_TEXT_CONTEXT = {
    ...createwritetextcontext(width, height, FG, BG),
    ...tiles,
    x: 0,
    y: height - 2,
    leftEdge: 0,
    rightEdge: width,
  }

  const blink = useBlink()

  // bail on odd states
  if (width < 1 || height < 1) {
    return null
  }

  // logs
  for (let i = 0; i < tape.logs.length && context.y >= 0; ++i) {
    const [id, maybelevel, source, ...message] = tape.logs[i]
    const level = maybelevel === 'log' ? '' : `${maybelevel}:`
    const messagetext = message
      .map((v) => (isstring(v) ? v : JSON.stringify(v).replaceAll('"', '')))
      .join(' ')
    const rowtext = `${id.slice(id.length - 3)}>${source}>${level} ${messagetext}`
    const measure = tokenizeandmeasuretextformat(rowtext, width, height)
    //
    context.y -= measure?.y ?? 1
    const reset = context.y
    tokenizeandwritetextformat(rowtext, context, true)
    context.y = reset
  }

  // write hint
  const hint = 'if lost try #help'
  context.x = width - hint.length - 1
  context.y = height - 2
  tokenizeandwritetextformat(`$dkcyan${hint}`, context, true)

  // input & selection
  const visiblerange = width - 3
  const inputindex = (height - 1) * width + 1
  const inputstate = tapeinput.buffer[tapeinput.bufferindex]

  let ii1 = tapeinput.cursor
  let ii2 = tapeinput.cursor
  let hasselection = false
  if (ispresent(tapeinput.selection)) {
    ii1 = Math.min(tapeinput.cursor, tapeinput.selection)
    ii2 = Math.max(tapeinput.cursor, tapeinput.selection)
    if (tapeinput.cursor !== tapeinput.selection) {
      --ii2
      hasselection = true
    }
  }

  const iic = ii2 - ii1 + 1
  const inputstateselected = hasselection
    ? inputstate.substring(ii1, ii2 + 1)
    : inputstate

  // draw input line
  const inputline = inputstate.padEnd(width - 2, '_')
  applystrtoindex(inputindex, inputline, context)

  // draw selection
  if (hasselection) {
    const p1 = inputindex + ii1
    const p2 = inputindex + ii2
    applycolortoindexes(p1, p2, 15, 8, context)
  }

  // draw cursor
  if (blink) {
    applystrtoindex(
      inputindex + tapeinput.cursor,
      String.fromCharCode(221),
      context,
    )
  }

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
    tapeinputstate.selection = undefined
    tapeinputstate.cursor = index + (insert ?? '').length
  }

  function inputstateswitch(switchto: number) {
    const ir = tapeinput.buffer.length - 1
    const index = clamp(switchto, 0, ir)
    tapeinputstate.selection = undefined
    tapeinputstate.bufferindex = index
    tapeinputstate.cursor = tapeinputstate.buffer[index].length
  }

  function trackselection(index: number | undefined) {
    if (ispresent(index)) {
      if (!ispresent(tapeinput.selection)) {
        tapeinputstate.selection = clamp(index, 0, inputstate.length)
      }
    } else {
      tapeinputstate.selection = undefined
    }
  }

  function deleteselection() {
    tapeinputstate.cursor = ii1
    tapeinputstate.selection = undefined
    inputstatesetsplice(ii1, iic)
  }

  return (
    <group
      // eslint-disable-next-line react/no-unknown-property
      position={[marginX * 0.5 + left, marginY + top, 0]}
      scale={[SCALE, SCALE, 1.0]}
    >
      {tape.open ? (
        <UserFocus>
          <UserHotkey hotkey="Escape">{() => tapesetopen(false)}</UserHotkey>
          <TileSnapshot width={width} height={height} tiles={tiles} />
          <UserInput
            MENU_BUTTON={(mods) => tapesetmode(mods.shift ? -1 : 1)}
            MOVE_UP={() => inputstateswitch(tapeinput.bufferindex + 1)}
            MOVE_DOWN={() => inputstateswitch(tapeinput.bufferindex - 1)}
            MOVE_LEFT={(mods) => {
              trackselection(mods.shift ? tapeinput.cursor : undefined)
              tapeinputstate.cursor = clamp(
                tapeinput.cursor - 1,
                0,
                inputstate.length,
              )
            }}
            MOVE_RIGHT={(mods) => {
              trackselection(mods.shift ? tapeinput.cursor : undefined)
              tapeinputstate.cursor = clamp(
                tapeinput.cursor + 1,
                0,
                inputstate.length,
              )
            }}
            OK_BUTTON={() => {
              const invoke = hasselection ? inputstateselected : inputstate
              if (invoke.length) {
                tapeinputstate.cursor = 0
                tapeinputstate.bufferindex = 0
                tapeinputstate.selection = undefined
                tapeinputstate.buffer = [
                  '',
                  invoke,
                  ...tapeinput.buffer
                    .slice(1)
                    .filter((item) => item !== invoke),
                ]
                vm_cli('tape', invoke, gadgetstategetplayer())
              }
            }}
            keydown={(event) => {
              const { key } = event
              const lkey = key.toLowerCase()
              const mods: UserInputMods = {
                alt: event.altKey,
                ctrl: isMac ? event.metaKey : event.ctrlKey,
                shift: event.shiftKey,
              }

              switch (lkey) {
                case 'delete':
                  if (hasselection) {
                    deleteselection()
                  } else if (inputstate.length > 0) {
                    inputstatesetsplice(tapeinput.cursor, 1)
                  }
                  break
                case 'backspace':
                  if (hasselection) {
                    deleteselection()
                  } else if (tapeinput.cursor > 0) {
                    inputstatesetsplice(tapeinput.cursor - 1, 1)
                    tapeinputstate.cursor = tapeinput.cursor - 1
                  }
                  break
                default:
                  if (mods.ctrl) {
                    switch (lkey) {
                      case 'a':
                        tapeinputstate.selection = 0
                        tapeinputstate.cursor = inputstate.length
                        break
                      case 'c':
                        if (ispresent(navigator.clipboard)) {
                          navigator.clipboard
                            .writeText(inputstateselected)
                            .catch((err) => console.error(err))
                        }
                        break
                      case 'v':
                        if (ispresent(navigator.clipboard)) {
                          navigator.clipboard
                            .readText()
                            .then((text) => {
                              if (hasselection) {
                                inputstatesetsplice(ii1, iic, text)
                              } else {
                                inputstatesetsplice(tapeinput.cursor, 0, text)
                              }
                            })
                            .catch((err) => console.error(err))
                        }
                        break
                      case 'x':
                        if (ispresent(navigator.clipboard)) {
                          navigator.clipboard
                            .writeText(inputstateselected)
                            .then(() => deleteselection())
                            .catch((err) => console.error(err))
                        }
                        break
                    }
                  } else if (mods.alt) {
                    // no-op ?? - could this shove text around when you have selection ??
                    // or jump by 10 or by word ??
                  } else if (
                    key.length === 1 &&
                    inputstate.length < visiblerange
                  ) {
                    if (hasselection) {
                      inputstatesetsplice(ii1, iic, key)
                      tapeinputstate.selection = undefined
                      tapeinputstate.cursor = ii1 + 1
                    } else {
                      inputstatesetsplice(tapeinput.cursor, 0, key)
                      tapeinputstate.cursor = tapeinput.cursor + 1
                    }
                  }
                  break
              }
            }}
          />
        </UserFocus>
      ) : (
        <UserHotkey hotkey="Shift+?">
          {() => tapesetopen(!tape.open)}
        </UserHotkey>
      )}
    </group>
  )
}
