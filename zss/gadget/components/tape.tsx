import { useThree } from '@react-three/fiber'
import { tape_terminal_open } from 'zss/device/api'
import { gadgetstategetplayer } from 'zss/device/gadgetclient'
import { TAPE_DISPLAY, useTape } from 'zss/device/tape'
import {
  WRITE_TEXT_CONTEXT,
  WriteTextContext,
  createwritetextcontext,
} from 'zss/gadget/data/textformat'

import { BG, CHAR_HEIGHT, CHAR_WIDTH, BKG_PTRN, FG, SCALE } from './tape/common'
import { TapeConsoleEditor } from './tape/editor'
import { TapeConsoleTerminal } from './tape/terminal'
import { PlayerContext } from './useplayer'
import { UserHotkey } from './userinput'
import { TileSnapshot, resetTiles, useTiles } from './usetiles'

export function TapeConsole() {
  const viewport = useThree((state) => state.viewport)
  const { width: viewWidth, height: viewHeight } = viewport.getCurrentViewport()

  const tape = useTape()

  const cols = Math.floor(viewWidth / CHAR_WIDTH)
  const rows = Math.floor(viewHeight / CHAR_HEIGHT)
  const marginx = viewWidth - cols * CHAR_WIDTH
  const marginy = viewHeight - rows * CHAR_HEIGHT

  let top = 0
  let left = 0
  let width = cols
  let height = rows

  switch (tape.terminal.layout) {
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
    x: 0,
    y: 0,
    leftEdge: 0,
    rightEdge: width,
  }

  // bail on odd states
  if (width < 1 || height < 1) {
    return null
  }

  // user id
  const player = gadgetstategetplayer()

  return (
    <group
      // eslint-disable-next-line react/no-unknown-property
      position={[marginx * 0.5 + left, marginy + top, 0]}
      scale={[SCALE, SCALE, 1.0]}
    >
      {tape.terminal.open ? (
        <>
          <TileSnapshot width={width} height={height} tiles={tiles} />
          <PlayerContext.Provider value={player}>
            <WriteTextContext.Provider value={context}>
              {tape.editor.open ? (
                <TapeConsoleEditor />
              ) : (
                <TapeConsoleTerminal />
              )}
            </WriteTextContext.Provider>
          </PlayerContext.Provider>
        </>
      ) : (
        <UserHotkey hotkey="Shift+?">
          {() => tape_terminal_open('tape')}
        </UserHotkey>
      )}
    </group>
  )
}
