import { useThree } from '@react-three/fiber'
import { tapesetopen, useTape } from 'zss/device/tape'
import {
  WRITE_TEXT_CONTEXT,
  createWriteTextContext,
  tokenizeAndWriteTextFormat,
} from 'zss/gadget/data/textformat'
import { DRAW_CHAR_HEIGHT, DRAW_CHAR_WIDTH } from 'zss/gadget/data/types'

import { UserHotkey } from './userinput'
import { TileSnapshot, resetTiles, useTiles } from './usetiles'

export function TapeConsole() {
  const viewport = useThree((state) => state.viewport)
  const { width: viewWidth, height: viewHeight } = viewport.getCurrentViewport()

  const fg = 10
  const bg = 2

  const tape = useTape()

  const width = Math.floor(viewWidth / DRAW_CHAR_WIDTH)
  const height = Math.floor((viewHeight / DRAW_CHAR_HEIGHT) * tape.open)
  const marginX = viewWidth - width * DRAW_CHAR_WIDTH
  const marginY = viewHeight - height * DRAW_CHAR_HEIGHT

  const tiles = useTiles(width, height, 0, 0, 0)
  resetTiles(tiles, 178, 0, bg)

  const junk = useTiles(width, height, 0, 0, 0)
  function measurerow(text: string) {
    const junkcontext: WRITE_TEXT_CONTEXT = {
      ...createWriteTextContext(width, height, fg, bg),
      ...junk,
      x: 0,
      leftEdge: 0,
      rightEdge: width,
    }
    tokenizeAndWriteTextFormat(text, junkcontext)
    return junkcontext.y
  }

  const context: WRITE_TEXT_CONTEXT = {
    ...createWriteTextContext(width, height, fg, bg),
    ...tiles,
    x: 0,
    y: height - 1,
    leftEdge: 0,
    rightEdge: width,
  }

  // bail on odd states
  if (width < 1 || height < 1) {
    return null
  }

  for (let i = 0; i < tape.logs.length; ++i) {
    const [id, level, source, ...message] = tape.logs[i]
    const messagetext = message.map((v) => JSON.stringify(v)).join(' ')
    const rowtext = `${id.slice(id.length - 3)}>${source}>${level}: ${messagetext}`
    context.y -= measurerow(rowtext) + 1
    if (context.y >= 0) {
      tokenizeAndWriteTextFormat(rowtext, context)
    }
  }

  return (
    <group position={[marginX * 0.5, marginY * 0.5, 0]}>
      <UserHotkey hotkey="Escape">
        {() => {
          if (tape.open) {
            tapesetopen(false)
          }
        }}
      </UserHotkey>
      <UserHotkey hotkey="Shift+?">
        {() => {
          if (!tape.open) {
            tapesetopen(true)
          }
        }}
      </UserHotkey>
      {tape.open && (
        <TileSnapshot width={width} height={height} tiles={tiles} />
      )}
    </group>
  )
}
