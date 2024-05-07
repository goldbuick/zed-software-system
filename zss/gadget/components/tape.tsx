import { useThree } from '@react-three/fiber'
import { tapesetopen, useTape } from 'zss/device/tape'
import {
  WRITE_TEXT_CONTEXT,
  createwritetextcontext,
  tokenizeAndWriteTextFormat,
  tokenizeandmeasuretextformat,
} from 'zss/gadget/data/textformat'
import { COLOR, DRAW_CHAR_HEIGHT, DRAW_CHAR_WIDTH } from 'zss/gadget/data/types'
import { clamp } from 'zss/mapping/number'

import { UserHotkey } from './userinput'
import { TileSnapshot, resetTiles, useTiles } from './usetiles'

export function TapeConsole() {
  const viewport = useThree((state) => state.viewport)
  const { width: viewWidth, height: viewHeight } = viewport.getCurrentViewport()

  const scale = 1
  const fg = COLOR.PURPLE
  const bg = COLOR.DKPURPLE
  const tw = DRAW_CHAR_WIDTH * scale
  const th = DRAW_CHAR_HEIGHT * scale

  const tape = useTape()

  const width = Math.floor(viewWidth / tw)
  const fullheight = Math.floor(viewHeight / th)
  const height = clamp(Math.round(fullheight * tape.open), 1, fullheight)
  const marginX = viewWidth - width * tw
  const marginY = viewHeight - height * th

  const tiles = useTiles(width, height, 0, fg, bg)

  resetTiles(tiles, 250, fg, bg)
  const context: WRITE_TEXT_CONTEXT = {
    ...createwritetextcontext(width, height, fg, bg),
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
    const measure = tokenizeandmeasuretextformat(rowtext, width, height)
    context.y -= (measure?.y ?? 1) + 1
    if (context.y >= 0) {
      tokenizeAndWriteTextFormat(rowtext, context)
    }
  }

  return (
    <group position={[marginX * 0.5, marginY, 0]} scale={[scale, scale, 1.0]}>
      <UserHotkey hotkey="Escape">
        {() => {
          tapesetopen(0)
        }}
      </UserHotkey>
      <UserHotkey hotkey="Shift+?">
        {() => {
          tapesetopen(tape.open > 0 ? 0 : 0.5)
        }}
      </UserHotkey>
      {tape.open !== 0 && (
        <TileSnapshot width={width} height={height} tiles={tiles} />
      )}
    </group>
  )
}
