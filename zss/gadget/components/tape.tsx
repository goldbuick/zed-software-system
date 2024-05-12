import { useThree } from '@react-three/fiber'
import { useState } from 'react'
import {
  TAPE_DISPLAY,
  tapesetmode,
  tapesetopen,
  useTape,
} from 'zss/device/tape'
import {
  WRITE_TEXT_CONTEXT,
  createwritetextcontext,
  tokenizeAndWriteTextFormat as tokenizeandwritetextformat,
  tokenizeandmeasuretextformat,
  applystrtoindex,
  applycolortoindexes,
} from 'zss/gadget/data/textformat'
import { COLOR, DRAW_CHAR_HEIGHT, DRAW_CHAR_WIDTH } from 'zss/gadget/data/types'
import { clamp } from 'zss/mapping/number'
import { stringsplice } from 'zss/mapping/string'
import { ispresent } from 'zss/mapping/types'

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

export function TapeConsole() {
  const viewport = useThree((state) => state.viewport)
  const { width: viewWidth, height: viewHeight } = viewport.getCurrentViewport()

  const tape = useTape()

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
  const [cursor, setcursor] = useState(0)
  const [inputbufferindex, setinputbufferindex] = useState(0)
  const [inputbuffer, setinputbuffer] = useState<string[]>([''])
  const [selection, setselection] = useState<number | undefined>(undefined)

  // bail on odd states
  if (width < 1 || height < 1) {
    return null
  }

  // logs
  for (let i = 0; i < tape.logs.length && context.y >= 0; ++i) {
    const [id, level, source, ...message] = tape.logs[i]
    const messagetext = message.map((v) => JSON.stringify(v)).join(' ')
    const rowtext = `${id.slice(id.length - 3)}>${source}>${level}: ${messagetext}`
    const measure = tokenizeandmeasuretextformat(rowtext, width, height)
    //
    context.y -= measure?.y ?? 1
    const reset = context.y
    tokenizeandwritetextformat(rowtext, context)
    context.y = reset
  }

  // input & selection
  const visiblerange = width - 2
  const inputindex = (height - 1) * width
  const hasselection = ispresent(selection)
  const ii1 = hasselection ? Math.min(selection, cursor) : cursor
  const ii2 = hasselection ? Math.max(selection, cursor) : cursor
  const iic = ii2 - ii1

  const inputstate = inputbuffer[inputbufferindex]
  const inputstateselected = hasselection
    ? inputstate.substring(ii1, ii2 + 1)
    : inputstate

  // draw input line
  const inputline = inputstate.padEnd(width, '_')
  applystrtoindex(inputindex, inputline, context)
  // draw selection
  if (hasselection) {
    applycolortoindexes(inputindex + ii1, inputindex + ii2, 15, 8, context)
  }
  // draw cursor
  if (blink) {
    applystrtoindex(inputindex + cursor, String.fromCharCode(221), context)
  }

  // update state
  function inputstatesetsplice(index: number, count: number, insert?: string) {
    inputbuffer[inputbufferindex] = stringsplice(
      inputstate,
      index,
      count,
      insert,
    )
  }

  function trackselection(index: number | undefined) {
    if (ispresent(index)) {
      if (!ispresent(selection)) {
        setselection(clamp(index, 0, inputstate.length - 1))
      }
    } else {
      setselection(undefined)
    }
  }

  function deleteselection() {
    setcursor(ii1)
    setselection(undefined)
    inputstatesetsplice(ii1, iic)
  }

  return (
    <group
      position={[marginX * 0.5 + left, marginY + top, 0]}
      scale={[SCALE, SCALE, 1.0]}
    >
      {tape.open ? (
        <UserFocus>
          <UserHotkey hotkey="Escape">{() => tapesetopen(false)}</UserHotkey>
          <TileSnapshot width={width} height={height} tiles={tiles} />
          <UserInput
            MENU_BUTTON={(mods) => tapesetmode(mods.shift ? -1 : 1)}
            MOVE_UP={() => {
              setinputbufferindex(
                clamp(inputbufferindex + 1, 0, inputbuffer.length - 1),
              )
            }}
            MOVE_DOWN={() => {
              setinputbufferindex(
                clamp(inputbufferindex - 1, 0, inputbuffer.length - 1),
              )
            }}
            MOVE_LEFT={(mods) => {
              trackselection(mods.shift ? cursor : undefined)
              setcursor(clamp(cursor - 1, 0, inputstate.length))
            }}
            MOVE_RIGHT={(mods) => {
              trackselection(mods.shift ? cursor : undefined)
              setcursor(clamp(cursor + 1, 0, inputstate.length))
            }}
            OK_BUTTON={() => {
              const invoke = hasselection ? inputstateselected : inputstate
              setinputbuffer([invoke, ...inputbuffer])
              setinputbufferindex(0)
              setcursor(0)
              setselection(undefined)
              setinputbuffer(['', ...inputbuffer])
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
                    inputstatesetsplice(cursor, 1)
                  }
                  break
                case 'backspace':
                  if (hasselection) {
                    deleteselection()
                  } else if (cursor > 0) {
                    inputstatesetsplice(cursor - 1, 1)
                    setcursor(cursor - 1)
                  }
                  break
                default:
                  if (mods.ctrl) {
                    switch (lkey) {
                      case 'a':
                        setselection(0)
                        setcursor(inputstate.length)
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
                                setselection(undefined)
                                setcursor(ii2)
                              } else {
                                inputstatesetsplice(cursor, 0, text)
                                setcursor(cursor + text.length)
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
                    // or jump by 10 ?
                  } else if (
                    key.length === 1 &&
                    inputstate.length < visiblerange
                  ) {
                    if (hasselection) {
                      setcursor(ii2)
                      inputstatesetsplice(ii1, ii2, key)
                    } else {
                      setcursor(cursor + 1)
                      inputstatesetsplice(cursor, cursor, key)
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
