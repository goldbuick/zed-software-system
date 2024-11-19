import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { MESSAGE } from 'zss/chip'
import { LOG_DEBUG } from 'zss/config'
import { createdevice } from 'zss/device'
import { tape_terminal_open } from 'zss/device/api'
import { gadgetstategetplayer } from 'zss/device/gadgetclient'
import {
  WRITE_TEXT_CONTEXT,
  createwritetextcontext,
} from 'zss/gadget/data/textformat'
import { createsid } from 'zss/mapping/guid'
import { isarray, isboolean } from 'zss/mapping/types'

import { DRAW_CHAR_HEIGHT, DRAW_CHAR_WIDTH } from '../data/types'

import { ShadeBoxDither } from './dither'
import { BG, CHAR_HEIGHT, CHAR_WIDTH, FG, SCALE } from './tape/common'
import { BackPlate } from './tape/elements/backplate'
import { TapeLayout } from './tape/layout'
import { PlayerContext } from './useplayer'
import { UserFocus, UserHotkey } from './userinput'
import { TileSnapshot, useTiles } from './usetiles'

export enum TAPE_LOG_LEVEL {
  OFF,
  INFO,
  DEBUG,
}

type TAPE_ROW = [string, string, string, ...any[]]

export const TAPE_MAX_LINES = 128

export enum TAPE_DISPLAY {
  TOP,
  BOTTOM,
  FULL,
  SPLIT_X,
  SPLIT_X_ALT,
  SPLIT_Y,
  SPLIT_Y_ALT,
  RIGHT,
  LEFT,
  MAX,
}

// message controlled state

type TAPE_STATE = {
  layout: TAPE_DISPLAY
  terminal: {
    open: boolean
    level: TAPE_LOG_LEVEL
    logs: TAPE_ROW[]
  }
  editor: {
    open: boolean
    player: string
    book: string
    page: string
    type: string
    title: string
  }
}

const tape: TAPE_STATE = {
  layout: TAPE_DISPLAY.BOTTOM,
  terminal: {
    open: true,
    level: LOG_DEBUG ? TAPE_LOG_LEVEL.DEBUG : TAPE_LOG_LEVEL.INFO,
    logs: [],
  },
  editor: {
    open: false,
    player: '',
    book: '',
    page: '',
    type: '',
    title: '',
  },
}

function terminaladdmessage(message: MESSAGE) {
  tape.terminal.logs.unshift([
    createsid(),
    message.target,
    message.sender,
    ...message.data,
  ])
  if (tape.terminal.logs.length > TAPE_MAX_LINES) {
    tape.terminal.logs = tape.terminal.logs.slice(0, TAPE_MAX_LINES)
  }
}

function terminalinclayout(inc: boolean) {
  const step = inc ? 1 : -1
  tape.layout = ((tape.layout as number) + step) as TAPE_DISPLAY
  if ((tape.layout as number) < 0) {
    tape.layout += TAPE_DISPLAY.MAX
  }
  if ((tape.layout as number) >= (TAPE_DISPLAY.MAX as number)) {
    tape.layout -= TAPE_DISPLAY.MAX
  }
  if (!tape.editor.open) {
    switch (tape.layout) {
      case TAPE_DISPLAY.SPLIT_X:
      case TAPE_DISPLAY.SPLIT_Y:
      case TAPE_DISPLAY.SPLIT_X_ALT:
      case TAPE_DISPLAY.SPLIT_Y_ALT:
        terminalinclayout(inc)
        break
    }
  }
}

export function Tape() {
  const viewport = useThree((state) => state.viewport)
  const { width: viewWidth, height: viewHeight } = viewport.getCurrentViewport()

  useEffect(() => {
    createdevice('', [], (message) => {
      switch (message.target) {
        case 'info':
          if (tape.terminal.level >= TAPE_LOG_LEVEL.INFO) {
            terminaladdmessage(message)
          }
          break
        case 'debug':
          if (tape.terminal.level >= TAPE_LOG_LEVEL.DEBUG) {
            terminaladdmessage(message)
          }
          break
        case 'error':
          if (tape.terminal.level > TAPE_LOG_LEVEL.OFF) {
            terminaladdmessage(message)
          }
          break
        case 'crash':
          tape.terminal.open = true
          tape.layout = TAPE_DISPLAY.FULL
          break
        case 'terminal:open':
          tape.terminal.open = true
          break
        case 'terminal:close':
          tape.terminal.open = false
          break
        case 'terminal:inclayout':
          if (isboolean(message.data)) {
            terminalinclayout(message.data)
          }
          break
        case 'editor:open':
          if (isarray(message.data)) {
            const [book, page, type, title] = message.data ?? ['', '', '']
            tape.terminal.open = true
            tape.editor.open = true
            tape.editor.player = message.player ?? ''
            tape.editor.book = book
            tape.editor.page = page
            tape.editor.type = type
            tape.editor.title = title
          }
          break
        case 'editor:close':
          tape.editor.open = false
          break
      }
    })
  }, [])

  const ditherwidth = Math.floor(viewWidth / DRAW_CHAR_WIDTH)
  const ditherheight = Math.floor(viewHeight / DRAW_CHAR_HEIGHT)

  const cols = Math.floor(viewWidth / CHAR_WIDTH)
  const rows = Math.floor(viewHeight / CHAR_HEIGHT)
  const marginx = viewWidth - cols * CHAR_WIDTH
  const marginy = viewHeight - rows * CHAR_HEIGHT

  let top = 0
  let left = 0
  let width = cols
  let height = rows

  switch (tape.layout) {
    case TAPE_DISPLAY.TOP:
      height = Math.round(rows * 0.5)
      break
    case TAPE_DISPLAY.RIGHT:
      width = Math.round(cols * 0.5)
      left = cols - width
      break
    case TAPE_DISPLAY.BOTTOM:
      height = Math.round(rows * 0.5)
      top = rows - height
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

  const context: WRITE_TEXT_CONTEXT = {
    ...createwritetextcontext(width, height, FG, BG),
    char: tiles.char,
    color: tiles.color,
    bg: tiles.bg,
  }

  // bail on odd states
  if (width < 1 || height < 1) {
    return null
  }

  // user id
  const player = gadgetstategetplayer()

  return (
    <>
      {tape.terminal.open && (
        // eslint-disable-next-line react/no-unknown-property
        <group position={[0, 0, 0]}>
          <ShadeBoxDither
            width={ditherwidth}
            height={ditherheight}
            top={top}
            left={left}
            right={left + width - 1}
            bottom={top + height - 1}
          />
        </group>
      )}
      <group
        // eslint-disable-next-line react/no-unknown-property
        position={[
          marginx * 0.5 + left * CHAR_WIDTH,
          marginy + top * CHAR_HEIGHT,
          1,
        ]}
        scale={[SCALE, SCALE, 1.0]}
      >
        {tape.terminal.open ? (
          <UserFocus blockhotkeys>
            <BackPlate context={context} />
            <PlayerContext.Provider value={player}>
              <TapeLayout context={context} />
            </PlayerContext.Provider>
            <TileSnapshot width={width} height={height} tiles={tiles} />
          </UserFocus>
        ) : (
          <UserHotkey hotkey="Shift+?">
            {() => tape_terminal_open('tape')}
          </UserHotkey>
        )}
      </group>
    </>
  )
}
