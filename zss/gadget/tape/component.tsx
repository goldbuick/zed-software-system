import { register_terminal_open } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { TAPE_DISPLAY, useTape } from 'zss/gadget/data/state'
import { useShallow } from 'zustand/react/shallow'

import { ShadeBoxDither } from '../graphics/dither'
import { UserFocus, UserHotkey } from '../userinput'
import { useScreenSize } from '../userscreen'

import { TapeLayout } from './layout'

export function Tape() {
  const screensize = useScreenSize()

  let top = 0
  let height = screensize.rows - 2

  const [layout, quickterminal, terminalopen, editoropen] = useTape(
    useShallow((state) => [
      state.layout,
      state.quickterminal,
      state.terminal.open,
      state.editor.open,
    ]),
  )

  switch (layout) {
    case TAPE_DISPLAY.TOP:
      height = Math.floor(screensize.rows * 0.5)
      break
    case TAPE_DISPLAY.BOTTOM:
      height = Math.ceil(screensize.rows * 0.5)
      top = screensize.rows - height
      break
    default:
    case TAPE_DISPLAY.FULL:
      // defaults
      break
  }

  // bail on odd states
  if (screensize.cols < 10 || screensize.rows < 10) {
    return null
  }

  const player = registerreadplayer()
  const showterminal = quickterminal || terminalopen || editoropen

  return (
    <>
      {showterminal && (
        <ShadeBoxDither
          width={screensize.cols}
          height={screensize.rows}
          top={top}
          left={0}
          right={screensize.cols - 1}
          bottom={top + height - 1}
        />
      )}
      {showterminal ? (
        <UserFocus blockhotkeys>
          <TapeLayout
            quickterminal={quickterminal}
            top={top}
            width={screensize.cols}
            height={height}
          />
        </UserFocus>
      ) : (
        <UserHotkey hotkey="Shift+?" althotkey="/">
          {() => register_terminal_open(SOFTWARE, player)}
        </UserHotkey>
      )}
    </>
  )
}
