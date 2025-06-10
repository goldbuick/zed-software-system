import { Vector2 } from 'three'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

import { useDeviceConfig, useWriteText } from '../hooks'

import { NumKey } from './numkey'
import { ThumbStick } from './thumbstick'
import { ToggleKey } from './togglekey'

type ElementsProps = {
  width: number
  height: number
  onReset: () => void
}

const motion = new Vector2()

export function Elements({ width, height, onReset }: ElementsProps) {
  const left = width - 19
  const mid = width - 13
  const right = width - 7
  const context = useWriteText()
  const { keyboardshift, keyboardctrl, keyboardalt } = useDeviceConfig()

  return (
    <>
      <NumKey x={left} y={1} letters="=" digit="1" />
      <NumKey x={mid} y={2} letters="ABC" digit="2" />
      <NumKey x={right} y={1} letters="DEF" digit="3" />

      <NumKey x={left} y={5} letters="GHI" digit="4" />
      <NumKey x={mid} y={6} letters="JKL" digit="5" />
      <NumKey x={right} y={5} letters="MNO" digit="6" />

      <NumKey x={left} y={9} letters="PQRS" digit="7" />
      <NumKey x={mid} y={10} letters="TUV" digit="8" />
      <NumKey x={right} y={9} letters="WXYZ" digit="9" />

      <NumKey x={left} y={13} letters="" digit="#" />
      <NumKey x={mid} y={14} letters="" digit="0" />
      <NumKey x={right} y={13} letters="ENTER" digit="[Enter]" />

      <NumKey x={1} y={1} letters="+" digit="-" />
      <NumKey x={7} y={2} letters="%" digit="*" />
      <NumKey x={13} y={1} letters="<" digit="(" />
      <NumKey x={19} y={2} letters=">" digit=")" />

      <NumKey x={1} y={5} letters="ESC" digit="[Escape]" />
      <ToggleKey
        x={7}
        y={6}
        letters={keyboardctrl ? 'CTRL' : 'ctrl'}
        onToggle={() => {
          useDeviceConfig.setState((state) => ({
            ...state,
            keyboardctrl: !state.keyboardctrl,
          }))
        }}
      />
      <ToggleKey
        x={13}
        y={5}
        letters={keyboardalt ? 'ALT' : 'alt'}
        onToggle={() => {
          useDeviceConfig.setState((state) => ({
            ...state,
            keyboardalt: !state.keyboardalt,
          }))
        }}
      />
      <NumKey x={19} y={6} letters="$26" digit="[ArrowRight]" />

      <NumKey x={1} y={9} letters="SPACE" digit="[Space]" />
      <ToggleKey
        x={7}
        y={10}
        letters={keyboardshift ? 'SHIFT' : 'shift'}
        onToggle={() => {
          useDeviceConfig.setState((state) => ({
            ...state,
            keyboardshift: !state.keyboardshift,
          }))
        }}
      />
      <NumKey x={13} y={9} letters="BKSPC" digit="[Backspace]" />
      <NumKey x={19} y={10} letters="$27" digit="[ArrowLeft]" />

      <NumKey x={1} y={13} letters="/" digit="?" />
      <NumKey x={7} y={14} letters=";" digit="!" />
      <NumKey x={13} y={13} letters=":" digit="'" />
      <NumKey x={19} y={14} letters={`"`} digit="@" />

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

/*
    '&',
    '_',
    '=',
    '|',   '`'
    '[ArrowUp]',
    '[ArrowLeft]',
    '[ArrowRight]',
    '[ArrowDown]',
*/

/*
  NONE,
  ALT,
  CTRL,
  SHIFT,
  MOVE_UP,
  MOVE_DOWN,
  MOVE_LEFT,
  MOVE_RIGHT,
  OK_BUTTON,
  CANCEL_BUTTON,
  MENU_BUTTON,

      <group>
        
      </group>

  */
