import { useThree } from '@react-three/fiber'
import { tape_terminal_open } from 'zss/device/api'
import { gadgetstategetplayer } from 'zss/device/gadgetclient'
import { TAPE_DISPLAY, useTape } from 'zss/device/tape'
import {
  WRITE_TEXT_CONTEXT,
  createwritetextcontext,
} from 'zss/gadget/data/textformat'

import { DRAW_CHAR_HEIGHT, DRAW_CHAR_WIDTH } from '../data/types'

import { StaticDither } from './dither'
import { BG, CHAR_HEIGHT, CHAR_WIDTH, BKG_PTRN, FG, SCALE } from './tape/common'
import { TapeLayout } from './tape/layout'
import { PlayerContext } from './useplayer'
import { UserFocus, UserHotkey } from './userinput'
import { TileSnapshot, resetTiles, useTiles } from './usetiles'

export function TapeConsole() {
  const viewport = useThree((state) => state.viewport)
  const { width: viewWidth, height: viewHeight } = viewport.getCurrentViewport()

  const tape = useTape()

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

  resetTiles(tiles, BKG_PTRN, FG, BG)
  const context: WRITE_TEXT_CONTEXT = {
    ...createwritetextcontext(width, height, FG, BG),
    ...tiles,
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
          <StaticDither width={ditherwidth} height={ditherheight} alpha={0.2} />
        </group>
      )}
      <group
        // eslint-disable-next-line react/no-unknown-property
        position={[marginx * 0.5 + left, marginy + top, 1]}
        scale={[SCALE, SCALE, 1.0]}
      >
        {tape.terminal.open ? (
          <UserFocus blockhotkeys>
            <TileSnapshot width={width} height={height} tiles={tiles} />
            <PlayerContext.Provider value={player}>
              <TapeLayout context={context} />
            </PlayerContext.Provider>
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
