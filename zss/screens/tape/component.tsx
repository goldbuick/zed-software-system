import { registerterminalopen } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { TAPE_DISPLAY, useTape } from 'zss/gadget/data/state'
import { ShadeBoxDither } from 'zss/gadget/graphics/dither'
import { UserFocus, UserHotkey } from 'zss/gadget/userinput'
import { useScreenSize } from 'zss/gadget/userscreen'
import { useShallow } from 'zustand/react/shallow'

import { TapeLayout } from './layout'

export function TapeComponent() {
  const screensize = useScreenSize()
  const [layout, quickterminal, terminalopen, editoropen] = useTape(
    useShallow((state) => [
      state.layout,
      state.quickterminal,
      state.terminal.open,
      state.editor.open,
    ]),
  )

  let top = 0
  let height = screensize.rows
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
          alpha={quickterminal ? 0.666 : 0.333}
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
        <>
          <UserHotkey hotkey="Shift+?" althotkey="/">
            {() => registerterminalopen(SOFTWARE, player)}
          </UserHotkey>
          <UserHotkey hotkey="`">
            {() => registerterminalopen(SOFTWARE, player)}
          </UserHotkey>
        </>
      )}
    </>
  )
}
