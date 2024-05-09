import { useThree } from '@react-three/fiber'
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
} from 'zss/gadget/data/textformat'
import { COLOR, DRAW_CHAR_HEIGHT, DRAW_CHAR_WIDTH } from 'zss/gadget/data/types'

import { UserFocus, UserHotkey, UserInput } from './userinput'
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

  console.info(tape)
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
      // no-op
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

  // bail on odd states
  if (width < 1 || height < 1) {
    return null
  }

  for (let i = 0; i < tape.logs.length && context.y >= 0; ++i) {
    const [id, level, source, ...message] = tape.logs[i]
    const messagetext = message.map((v) => JSON.stringify(v)).join(' ')
    const rowtext = `${id.slice(id.length - 3)}>${source}>${level}: ${messagetext}`
    const measure = tokenizeandmeasuretextformat(rowtext, width, height)
    context.y -= measure?.y ?? 1
    const reset = context.y
    tokenizeandwritetextformat(rowtext, context)
    context.y = reset
  }

  return (
    <group
      position={[marginX * 0.5 + left, marginY + top, 0]}
      scale={[SCALE, SCALE, 1.0]}
    >
      <UserHotkey hotkey="Escape">
        {() => {
          tapesetopen(false)
        }}
      </UserHotkey>
      <UserHotkey hotkey="Shift+?">
        {() => {
          tapesetopen(!tape.open)
        }}
      </UserHotkey>
      {tape.open && (
        <UserFocus>
          <TileSnapshot width={width} height={height} tiles={tiles} />
          <UserInput
            MENU_BUTTON={(mods) => {
              tapesetmode(mods.shift ? -1 : 1)
            }}
            keydown={(event) => {
              //
            }}
          />
        </UserFocus>
      )}
    </group>
  )
}
