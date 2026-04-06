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
  width: number
  height: number
  leftedge: number
  rightedge: number
}

export function KeyboardGame({
  width: _width,
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
  const midstart = leftedge
  const midcols = rightedge - leftedge + 1
  const top = 1
  const bottom = height - 4
  const ycenter = Math.floor(height * 0.5) - 2
  const canfitthree = midcols >= 15
  const row3x = midstart + Math.max(0, Math.floor((midcols - 15) / 2))
  const modx = midstart + Math.max(0, Math.floor((midcols - 5) / 2))

  let ctrlx: number
  let altx: number
  let shiftx: number
  let ctrly: number
  let alty: number
  let shifty: number
  if (canfitthree) {
    ctrlx = row3x
    altx = row3x + 5
    shiftx = row3x + 10
    ctrly = alty = shifty = top
  } else {
    ctrlx = altx = shiftx = modx
    ctrly = top
    alty = top + 3
    shifty = top + 6
  }

  const navy = canfitthree ? top + 3 : top + 9
  let tabx: number
  let enterx: number
  let escx: number
  let taby: number
  let entery: number
  let escy: number
  if (canfitthree) {
    tabx = row3x
    enterx = row3x + 5
    escx = row3x + 10
    taby = entery = escy = navy
  } else {
    tabx = enterx = escx = modx
    taby = navy
    entery = navy + 3
    escy = navy + 6
  }

  const cx = midstart + Math.floor(midcols / 2) - 2
  const dpadleftx = midstart
  const dpadrightx = rightedge - 4
  const dpadupy = Math.max(top + 1, ycenter - 4)
  const dpaddowny = Math.min(bottom, ycenter + 4)

  const termy = bottom - 1
  const termspread = Math.min(6, Math.max(1, Math.floor(midcols / 4)))
  const termx0 =
    midstart + Math.max(0, Math.floor((midcols - (4 * termspread + 1)) / 2))
  const termq = termx0
  const termhash = termx0 + termspread
  const termc = termx0 + 2 * termspread
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
        y={termy}
        letters="?"
        onToggle={() => {
          registerterminalopen(SOFTWARE, player)
        }}
      />
      <ToggleKey
        x={termhash}
        y={bottom}
        letters="#"
        onToggle={() => {
          registerterminalopen(SOFTWARE, player, '#')
        }}
      />
      <ToggleKey
        x={termc}
        y={termy}
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
        y={ycenter}
        letters="$26"
        onToggle={() => {
          inputdown(0, INPUT.MOVE_RIGHT)
          inputup(0, INPUT.MOVE_RIGHT)
        }}
      />
      <ToggleKey
        x={dpadleftx}
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
