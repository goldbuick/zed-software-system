import {
  register_terminal_open,
  register_terminal_quickopen,
  vm_clirepeatlast,
} from 'zss/device/api'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { INPUT } from 'zss/gadget/data/types'
import { useDeviceData } from 'zss/gadget/hooks'
import { inputdown, inputup } from 'zss/gadget/userinput'

import { ToggleKey } from './togglekey'

type KeyboardGameProps = {
  width: number
  height: number
}

export function KeyboardGame({ width, height }: KeyboardGameProps) {
  const { keyboardalt, keyboardctrl, keyboardshift } = useDeviceData()
  const left = width - 18
  const mid = width - 12
  const right = width - 6
  const top = 0
  const ycenter = Math.floor(height * 0.5) - 2
  const bottom = height - 4
  const center = Math.round(width * 0.5) - 3
  const player = registerreadplayer()
  return (
    <>
      <ToggleKey
        x={1}
        y={top}
        letters={keyboardctrl ? 'CTRL' : 'ctrl'}
        onToggle={() => {
          if (keyboardctrl) {
            inputup(0, INPUT.CTRL)
          } else {
            inputdown(0, INPUT.CTRL)
          }
          useDeviceData.setState({ keyboardctrl: !keyboardctrl })
        }}
      />
      <ToggleKey
        x={7}
        y={top + 1}
        letters={keyboardalt ? 'ALT' : 'alt'}
        onToggle={() => {
          if (keyboardalt) {
            inputup(0, INPUT.ALT)
          } else {
            inputdown(0, INPUT.ALT)
          }
          useDeviceData.setState({ keyboardalt: !keyboardalt })
        }}
      />
      <ToggleKey
        x={13}
        y={top}
        letters={keyboardshift ? 'SHIFT' : 'shift'}
        onToggle={() => {
          if (keyboardshift) {
            inputup(0, INPUT.SHIFT)
          } else {
            inputdown(0, INPUT.SHIFT)
          }
          useDeviceData.setState({ keyboardshift: !keyboardshift })
        }}
      />
      <ToggleKey
        x={left}
        y={top}
        letters="tab"
        onToggle={() => {
          inputdown(0, INPUT.MENU_BUTTON)
          inputup(0, INPUT.MENU_BUTTON)
        }}
      />
      <ToggleKey
        x={mid}
        y={top + 1}
        letters="enter"
        onToggle={() => {
          inputdown(0, INPUT.OK_BUTTON)
          inputup(0, INPUT.OK_BUTTON)
        }}
      />
      <ToggleKey
        x={right}
        y={top}
        letters="esc"
        onToggle={() => {
          inputdown(0, INPUT.CANCEL_BUTTON)
          inputup(0, INPUT.CANCEL_BUTTON)
        }}
      />
      <ToggleKey
        x={1}
        y={bottom - 1}
        letters="?"
        onToggle={() => {
          register_terminal_open(SOFTWARE, player)
        }}
      />
      <ToggleKey
        x={7}
        y={bottom}
        letters="#"
        onToggle={() => {
          register_terminal_quickopen(SOFTWARE, player, '#')
        }}
      />
      <ToggleKey
        x={13}
        y={bottom - 1}
        letters="c"
        onToggle={() => {
          register_terminal_quickopen(SOFTWARE, player, '')
        }}
      />
      <ToggleKey
        x={right}
        y={bottom - 1}
        letters="ctrl+p"
        onToggle={() => {
          vm_clirepeatlast(SOFTWARE, player)
        }}
      />

      <ToggleKey
        x={center}
        y={top}
        letters="$24"
        onToggle={() => {
          inputdown(0, INPUT.MOVE_UP)
          inputup(0, INPUT.MOVE_UP)
        }}
      />
      <ToggleKey
        x={center}
        y={bottom}
        letters="$25"
        onToggle={() => {
          inputdown(0, INPUT.MOVE_DOWN)
          inputup(0, INPUT.MOVE_DOWN)
        }}
      />
      <ToggleKey
        x={width - 5}
        y={ycenter}
        letters="$26"
        onToggle={() => {
          inputdown(0, INPUT.MOVE_RIGHT)
          inputup(0, INPUT.MOVE_RIGHT)
        }}
      />
      <ToggleKey
        x={0}
        y={ycenter}
        letters="$27"
        onToggle={() => {
          inputdown(0, INPUT.MOVE_LEFT)
          inputup(0, INPUT.MOVE_LEFT)
        }}
      />
    </>
  )
}
