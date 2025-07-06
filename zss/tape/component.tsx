import { useFrame } from '@react-three/fiber'
import { damp3 } from 'maath/easing'
import { useRef } from 'react'
import { Group as GroupImpl } from 'three'
import { RUNTIME } from 'zss/config'
import { register_terminal_open } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { TAPE_DISPLAY, useTape, useTapeTerminal } from 'zss/gadget/data/state'
import { ShadeBoxDither } from 'zss/gadget/graphics/dither'
import { UserFocus, UserHotkey } from 'zss/gadget/userinput'
import { useScreenSize } from 'zss/gadget/userscreen'
import { clamp } from 'zss/mapping/number'
import { useShallow } from 'zustand/react/shallow'

import { TapeLayout } from './layout'

export function Tape() {
  const screensize = useScreenSize()
  const panref = useRef<GroupImpl>(null)
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

  useFrame((_, delta) => {
    if (!panref.current) {
      return
    }

    const width = Math.round(screensize.cols * 1.5)
    const start = Math.round(width * 0.412)
    const { xcursor, xselect } = useTapeTerminal.getState()
    const right = Math.max(xcursor, xselect ?? xcursor)
    const range = width - screensize.cols
    const ratio = clamp((right - start) / 4, 0, 1)

    damp3(
      panref.current.position,
      [range * RUNTIME.DRAW_CHAR_WIDTH() * -ratio, 0, 0],
      0.111,
      delta,
    )
  })

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
          <group ref={panref}>
            <TapeLayout
              quickterminal={quickterminal}
              top={top}
              width={screensize.cols}
              height={height}
            />
          </group>
        </UserFocus>
      ) : (
        <UserHotkey hotkey="Shift+?" althotkey="/">
          {() => register_terminal_open(SOFTWARE, player)}
        </UserHotkey>
      )}
    </>
  )
}
