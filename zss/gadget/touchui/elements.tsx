import { useDeviceConfig } from '../hooks'

import { NumKey } from './numkey'
import { Numpad } from './numpad'
import { ThumbStick } from './thumbstick'
import { ToggleKey } from './togglekey'

type ElementsProps = {
  width: number
  height: number
}

export function Elements({ width, height }: ElementsProps) {
  const { keyboardshift, keyboardctrl, keyboardalt } = useDeviceConfig()
  return (
    <>
      <Numpad width={width} />
      <NumKey x={1} y={1} letters="+" digit="-" />
      <NumKey x={7} y={1} letters="%" digit="*" />
      <NumKey x={13} y={1} letters="<" digit="(" />
      <NumKey x={19} y={1} letters=">" digit=")" />
      <NumKey x={1} y={5} letters="ESC" digit="[Escape]" />
      <ToggleKey
        x={7}
        y={5}
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
      <NumKey x={1} y={9} letters="SPACE" digit="[Space]" />
      <ToggleKey
        x={7}
        y={9}
        letters={keyboardshift ? 'SHIFT' : 'shift'}
        onToggle={() => {
          useDeviceConfig.setState((state) => ({
            ...state,
            keyboardshift: !state.keyboardshift,
          }))
        }}
      />
      <NumKey x={13} y={9} letters="BKSPC" digit="[Backspace]" />
      <NumKey x={1} y={13} letters="/" digit="?" />
      <NumKey x={7} y={13} letters=";" digit="!" />
      <NumKey x={13} y={13} letters=":" digit="'" />
      <NumKey x={19} y={13} letters={`"`} digit="@" />
      <ThumbStick
        width={width}
        height={height}
        onDown={() => {
          useDeviceConfig.setState((state) => ({
            ...state,
            showkeyboard: false,
          }))
        }}
        onUp={() => {
          useDeviceConfig.setState((state) => ({
            ...state,
            showkeyboard: true,
          }))
        }}
        onDrawStick={(startx, starty, tipx, tipy) => {
          console.info(startx, starty, tipx, tipy)
          // context.x = startx
          // context.y = starty
          // tokenizeandwritetextformat(`$176$176$176$176$176`, context, false)
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
