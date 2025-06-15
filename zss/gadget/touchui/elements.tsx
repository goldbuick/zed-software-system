import { Vector2 } from 'three'
import { tokenizeandwritetextformat } from 'zss/words/textformat'
import { COLOR } from 'zss/words/types'

import { useTape } from '../data/state'
import { resetTiles, useDeviceConfig, useWriteText, writeTile } from '../hooks'

import { KeyboardAlt } from './keyboardalt'
import { KeyboardCtrl } from './keyboardctrl'
import { KeyboardDev } from './keyboarddev'
import { KeyboardGame } from './keyboardgame'
import { ThumbStick } from './thumbstick'
import { TouchPlane } from './touchplane'

type ElementsProps = {
  width: number
  height: number
  onReset: () => void
}

const motion = new Vector2()
const DECO = 177
const FG = COLOR.WHITE
const BG = COLOR.DKPURPLE

export function Elements({ width, height, onReset }: ElementsProps) {
  const context = useWriteText()
  const isopen = useTape(
    (state) => state.editor.open || state.terminal.open || state.quickterminal,
  )
  const { keyboardalt, keyboardctrl } = useDeviceConfig()

  resetTiles(context, DECO, FG, BG)

  const leftedge = Math.floor(width * 0.333)
  const rightedge = Math.round(width * 0.666)
  for (let y = 0; y < height; ++y) {
    for (let x = leftedge; x <= rightedge; ++x) {
      writeTile(context, width, height, x, y, { char: 176 })
    }
  }

  return (
    <>
      <TouchPlane
        x={0}
        y={-3}
        width={width}
        height={3}
        onPointerDown={() => {
          // toggle sidebar
          useDeviceConfig.setState((state) => ({
            ...state,
            sidebaropen: !state.sidebaropen,
          }))
        }}
      />
      {isopen ? (
        <>
          {keyboardalt && <KeyboardAlt width={width} />}
          {keyboardctrl && <KeyboardCtrl width={width} />}
          {!keyboardalt && !keyboardctrl && <KeyboardDev width={width} />}
        </>
      ) : (
        <KeyboardGame width={width} />
      )}
      <ThumbStick
        width={width}
        height={height}
        onUp={onReset}
        onDrawStick={(startx, starty, tipx, tipy) => {
          for (let i = 0; i < 5; ++i) {
            context.x = startx - 3
            context.y = starty - 2 + i
            tokenizeandwritetextformat(
              `$dkblue$177$177$177$177$177$177$177`,
              context,
              false,
            )
          }
          // limit knob range
          motion.x = tipx - startx
          motion.y = tipy - starty
          motion.normalize().multiplyScalar(4)
          for (let i = 0; i < 3; ++i) {
            context.x = startx + Math.round(motion.x) - 1
            context.y = starty + Math.round(motion.y) - 1 + i
            tokenizeandwritetextformat(`$blue$219$219$219`, context, false)
          }
        }}
      />
    </>
  )
}
