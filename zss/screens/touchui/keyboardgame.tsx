import {
  registerterminalopen,
  registerterminalquickopen,
  vmclirepeatlast,
} from 'zss/device/api'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { INPUT } from 'zss/gadget/data/types'
import { useDeviceData } from 'zss/gadget/device'
import { inputdown, inputup } from 'zss/gadget/userinput'
import { metakey } from 'zss/words/system'
import { useShallow } from 'zustand/react/shallow'

import { ToggleKey } from './togglekey'

type KeyboardGameProps = {
  height: number
  leftedge: number
  rightedge: number
}

export function KeyboardGame({
  height,
  leftedge,
  rightedge,
}: KeyboardGameProps) {
  const { keyboardalt, keyboardctrl, keyboardshift } = useDeviceData(
    useShallow((state) => ({
      keyboardalt: state.keyboardalt,
      keyboardctrl: state.keyboardctrl,
      keyboardshift: state.keyboardshift,
    })),
  )
  // 5 + 1 + 5 + 1 + 5 = 18
  const midstart = leftedge
  const midcols = rightedge - leftedge + 1
  const top = 1
  const bottom = height - 4
  const ycenter = Math.floor(height * 0.5) - 2
  const row3x = midstart
  const ctrlx = row3x
  const altx = row3x + 7
  const shiftx = row3x + 14
  const ctrly = top + 1
  const alty = top
  const shifty = top + 1

  const navy = top + 4
  const tabx = row3x
  const enterx = row3x + 7
  const escx = row3x + 14
  const taby = navy + 1
  const entery = navy
  const escy = navy + 1

  const termrowy = navy + 4
  const termq = tabx
  const termhash = enterx
  const termc = escx
  const termqy = termrowy + 1
  const termhashy = termrowy
  const termcy = termrowy + 1

  const cx = midstart + Math.floor(midcols / 2) - 2
  const dpadleftx = midstart
  const dpadrightx = rightedge - 4
  const belowtermrow = Math.max(termqy, termhashy, termcy) + 4
  const dpadupy = Math.max(belowtermrow, ycenter)
  const dpadmidy = Math.min(bottom, dpadupy + 4)
  const dpaddowny = Math.min(bottom, dpadmidy + 4)

  const termy = bottom - 1
  const termrepeat = midstart + Math.max(0, midcols - 5)

  const player = registerreadplayer()
  return (
    <>
      <ToggleKey
        x={ctrlx}
        y={ctrly}
        letters={keyboardctrl ? metakey.toUpperCase() : metakey.toLowerCase()}
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
        x={altx}
        y={alty}
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
        x={shiftx}
        y={shifty}
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
        x={tabx}
        y={taby}
        letters="tab"
        onToggle={() => {
          inputdown(0, INPUT.MENU_BUTTON)
          inputup(0, INPUT.MENU_BUTTON)
        }}
      />
      <ToggleKey
        x={enterx}
        y={entery}
        letters="enter"
        onToggle={() => {
          inputdown(0, INPUT.OK_BUTTON)
          inputup(0, INPUT.OK_BUTTON)
        }}
      />
      <ToggleKey
        x={escx}
        y={escy}
        letters="esc"
        onToggle={() => {
          inputdown(0, INPUT.CANCEL_BUTTON)
          inputup(0, INPUT.CANCEL_BUTTON)
        }}
      />
      <ToggleKey
        x={termq}
        y={termqy}
        letters="?"
        onToggle={() => {
          registerterminalopen(SOFTWARE, player)
        }}
      />
      <ToggleKey
        x={termhash}
        y={termhashy}
        letters="#"
        onToggle={() => {
          registerterminalopen(SOFTWARE, player, '#')
        }}
      />
      <ToggleKey
        x={termc}
        y={termcy}
        letters="c"
        onToggle={() => {
          registerterminalquickopen(SOFTWARE, player, '')
        }}
      />
      <ToggleKey
        x={termrepeat}
        y={termy}
        letters="$meta+p"
        onToggle={() => {
          vmclirepeatlast(SOFTWARE, player)
        }}
      />

      <ToggleKey
        x={cx}
        y={dpadupy}
        letters="$24"
        onToggle={() => {
          inputdown(0, INPUT.MOVE_UP)
          inputup(0, INPUT.MOVE_UP)
        }}
      />
      <ToggleKey
        x={cx}
        y={dpaddowny}
        letters="$25"
        onToggle={() => {
          inputdown(0, INPUT.MOVE_DOWN)
          inputup(0, INPUT.MOVE_DOWN)
        }}
      />
      <ToggleKey
        x={dpadrightx}
        y={dpadmidy}
        letters="$26"
        onToggle={() => {
          inputdown(0, INPUT.MOVE_RIGHT)
          inputup(0, INPUT.MOVE_RIGHT)
        }}
      />
      <ToggleKey
        x={dpadleftx}
        y={dpadmidy}
        letters="$27"
        onToggle={() => {
          inputdown(0, INPUT.MOVE_LEFT)
          inputup(0, INPUT.MOVE_LEFT)
        }}
      />
    </>
  )
}
