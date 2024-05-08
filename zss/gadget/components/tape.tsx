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

import { UserFocus, UserHotkey, UserInput } from './userinput'
import { TileSnapshot, resetTiles, useTiles } from './usetiles'

const SCALE = 1
const FG = COLOR.BLUE
const BG = COLOR.DKBLUE
const TW = DRAW_CHAR_WIDTH * SCALE
const TH = DRAW_CHAR_HEIGHT * SCALE

export function TapeConsole() {
  const viewport = useThree((state) => state.viewport)
  const { width: viewWidth, height: viewHeight } = viewport.getCurrentViewport()

  const tape = useTape()
  const width = Math.floor(viewWidth / TW)
  const fullheight = Math.floor(viewHeight / TH)
  const height = clamp(Math.round(fullheight * tape.open), 1, fullheight)
  const marginX = viewWidth - width * TW
  const marginY = viewHeight - height * TH

  const tiles = useTiles(width, height, 0, FG, BG)

  resetTiles(tiles, 250, FG, BG)
  const context: WRITE_TEXT_CONTEXT = {
    ...createwritetextcontext(width, height, FG, BG),
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
    <group position={[marginX * 0.5, marginY, 0]} scale={[SCALE, SCALE, 1.0]}>
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
        <UserFocus>
          <TileSnapshot width={width} height={height} tiles={tiles} />
          <UserInput
            keydown={(event) => {
              //
            }}
          />
        </UserFocus>
      )}
    </group>
  )
}
