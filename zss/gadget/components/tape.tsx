import { useThree } from '@react-three/fiber'
import { tape_terminal_open } from 'zss/device/api'
import { gadgetstategetplayer } from 'zss/device/gadgetclient'
import { TAPE_DISPLAY, useTape } from 'zss/device/tape'
import {
  WRITE_TEXT_CONTEXT,
  createwritetextcontext,
} from 'zss/gadget/data/textformat'

import { DRAW_CHAR_HEIGHT, DRAW_CHAR_WIDTH } from '../data/types'

import { ShadeBoxDither } from './dither'
import { BG, CHAR_HEIGHT, CHAR_WIDTH, FG, SCALE } from './tape/common'
import { BackPlate } from './tape/elements/backplate'
import { TapeLayout } from './tape/layout'
import { PlayerContext } from './useplayer'
import { UserFocus, UserHotkey } from './userinput'
import { TileSnapshot, useTiles } from './usetiles'

export function TapeConsole() {
  const viewport = useThree((state) => state.viewport)
  const { width: viewWidth, height: viewHeight } = viewport.getCurrentViewport()

  const {
    layout,
    terminal: { open },
  } = useTape()

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

  switch (layout) {
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
      {open && (
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
        {open ? (
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
