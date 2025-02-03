import { COLOR } from 'zss/words/types'

import { ShadeBoxDither } from '../framed/dither'
import { Panel } from '../panel'
import { Rect } from '../rect'

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
          top={10}
          left={0}
          right={width - 1}
          bottom={height - 1}
          alpha={0.7135}
        />
        <Panel
          name="keyboard"
          color={COLOR.WHITE}
          bg={COLOR.ONCLEAR}
          width={width}
          height={height}
          text={[
            ['key', 'a', 'hk', 'akey', 'a'],
            ['key', 'b', 'hk', 'bkey', 'b'],
          ]}
        />
      </>
    )
  )
}
