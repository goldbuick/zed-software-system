import { useThree } from '@react-three/fiber'
import { tape_terminal_open } from 'zss/device/api'
import { TAPE_DISPLAY, useTape } from 'zss/gadget/data/state'
import { DRAW_CHAR_HEIGHT, DRAW_CHAR_WIDTH } from 'zss/gadget/data/types'
import {
  WRITE_TEXT_CONTEXT,
  createwritetextcontext,
} from 'zss/words/textformat'
import { useShallow } from 'zustand/react/shallow'

import { ShadeBoxDither } from './framed/dither'
import { useTiles } from './hooks'
import { BackPlate } from './tape/backplate'
import { BG, CHAR_HEIGHT, CHAR_WIDTH, FG, SCALE } from './tape/common'
import { TapeLayout } from './tape/layout'
import { UserFocus, UserHotkey } from './userinput'
import { TilesData, TilesRender } from './usetiles'

export function Tape() {
  const viewport = useThree((state) => state.viewport)
  const { width: viewWidth, height: viewHeight } = viewport.getCurrentViewport()

  const ditherwidth = Math.floor(viewWidth / DRAW_CHAR_WIDTH)
  const ditherheight = Math.floor(viewHeight / DRAW_CHAR_HEIGHT)

  const cols = Math.floor(viewWidth / CHAR_WIDTH)
  const rows = Math.floor(viewHeight / CHAR_HEIGHT)
  const marginx = viewWidth - cols * CHAR_WIDTH
  const marginy = viewHeight - rows * CHAR_HEIGHT

  let top = 0
  const left = 0
  const width = cols
  let height = rows

  const [layout, terminalopen] = useTape(
    useShallow((state) => [state.layout, state.terminal.open]),
  )

  switch (layout) {
    case TAPE_DISPLAY.TOP:
      height = Math.round(rows * 0.5)
      break
    case TAPE_DISPLAY.BOTTOM:
      height = Math.round(rows * 0.5)
      top = rows - height
      break
    default:
    case TAPE_DISPLAY.FULL:
      // defaults
      break
  }

  const store = useTiles(width, height, 0, FG, BG)
  const context: WRITE_TEXT_CONTEXT = {
    ...createwritetextcontext(width, height, FG, BG),
    ...store.getState(),
  }

  // bail on odd states
  if (width < 1 || height < 1) {
    return null
  }

  return (
    <TilesData store={store}>
      <group
        // eslint-disable-next-line react/no-unknown-property
        position={[0, 0, 900]}
      >
        {terminalopen && (
          <ShadeBoxDither
            width={ditherwidth}
            height={ditherheight}
            top={top}
            left={left}
            right={left + width - 1}
            bottom={top + height - 1}
          />
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
          {terminalopen ? (
            <UserFocus blockhotkeys>
              <BackPlate context={context} />
              <TapeLayout context={context} />
              <TilesRender width={width} height={height} />
            </UserFocus>
          ) : (
            <UserHotkey hotkey="Shift+?">
              {() => tape_terminal_open('tape')}
            </UserHotkey>
          )}
        </group>
      </group>
    </TilesData>
  )
}
