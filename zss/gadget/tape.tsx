/* eslint-disable react/no-unknown-property */
import { RUNTIME } from 'zss/config'
import { tape_terminal_open } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/register'
import { TAPE_DISPLAY, useTape } from 'zss/gadget/data/state'
import {
  WRITE_TEXT_CONTEXT,
  createwritetextcontext,
} from 'zss/words/textformat'
import { useShallow } from 'zustand/react/shallow'

import { ShadeBoxDither } from './framed/dither'
import { useTiles } from './hooks'
import { BackPlate } from './tape/backplate'
import { BG, FG } from './tape/common'
import { TapeLayout } from './tape/layout'
import { UserFocus, UserHotkey } from './userinput'
import { useScreenSize } from './userscreen'
import { TilesData, TilesRender } from './usetiles'

export function Tape() {
  const screensize = useScreenSize()

  let top = 0
  let height = screensize.rows

  const [layout, terminalopen] = useTape(
    useShallow((state) => [state.layout, state.terminal.open]),
  )

  switch (layout) {
    case TAPE_DISPLAY.TOP:
      height = Math.round(screensize.rows * 0.5)
      break
    case TAPE_DISPLAY.BOTTOM:
      height = Math.round(screensize.rows * 0.5)
      top = screensize.rows - height
      break
    default:
    case TAPE_DISPLAY.FULL:
      // defaults
      break
  }

  const store = useTiles(screensize.cols, height, 0, FG, BG)
  const context: WRITE_TEXT_CONTEXT = {
    ...createwritetextcontext(screensize.cols, height, FG, BG),
    ...store.getState(),
  }

  // bail on odd states
  if (screensize.cols < 10 || screensize.rows < 10) {
    return null
  }

  const player = registerreadplayer()

  return (
    <TilesData store={store}>
      <group
        // eslint-disable-next-line react/no-unknown-property
        position={[0, 0, 900]}
      >
        {terminalopen && (
          <ShadeBoxDither
            width={screensize.cols}
            height={screensize.rows}
            top={top}
            left={0}
            right={screensize.cols - 1}
            bottom={top + height - 1}
          />
        )}
        {terminalopen ? (
          <UserFocus blockhotkeys>
            <BackPlate context={context} />
            <TapeLayout context={context} />
            <group position={[0, top * RUNTIME.DRAW_CHAR_HEIGHT(), 0]}>
              <TilesRender width={screensize.cols} height={height} />
            </group>
          </UserFocus>
        ) : (
          <UserHotkey hotkey="Shift+?">
            {() => tape_terminal_open('tape', player)}
          </UserHotkey>
        )}
      </group>
    </TilesData>
  )
}
