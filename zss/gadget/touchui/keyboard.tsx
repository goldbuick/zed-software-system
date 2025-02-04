import { COLOR } from 'zss/words/types'

import { ShadeBoxDither } from '../framed/dither'
import { Panel } from '../panel'
import { Rect } from '../rect'

const KEYBOARD_HEIGHT = 10

const LETTER_KEYS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '\n'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', '\n'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M', '\n'],
].flat()

const SYMBOL_KEYS = [
  '!',
  "'",
  '^',
  '#',
  '+',
  '$',
  '%',
  '½',
  '&',
  '/',
  '{',
  '}',
  '(',
  ')',
  '[',
  ']',
  '=',
  '*',
  '?',
  '\\',
  '-',
  '_',
  '|',
  '@',
  '€',
  '₺',
  '~',
  'æ',
  'ß',
  '<',
  '>',
  ',',
  ';',
  '.',
  ':',
  '`',
]

function hk(hotkey: string) {
  return ['key', hotkey, 'hk', `${hotkey}key`, hotkey]
}

type KeyboardProps = {
  width: number
  height: number
  showkeyboard: boolean
  onToggleKeyboard: () => void
}

export function Keyboard({
  width,
  height,
  showkeyboard,
  onToggleKeyboard,
}: KeyboardProps) {
  return (
    showkeyboard && (
      <>
        <Rect
          blocking
          width={width}
          height={height}
          visible={false}
          onClick={onToggleKeyboard}
        />
        <ShadeBoxDither
          width={width}
          height={height}
          top={height - KEYBOARD_HEIGHT - 1}
          left={0}
          right={width - 1}
          bottom={height - 1}
          alpha={0.89}
        />
        <group>
          <Panel
            name="keyboard"
            color={COLOR.WHITE}
            bg={COLOR.ONCLEAR}
            width={width}
            height={KEYBOARD_HEIGHT}
            text={LETTER_KEYS.map((letter) => {
              if (letter === '\n') {
                return letter
              }
              return hk(letter)
            })}
          />
        </group>
      </>
    )
  )
}
