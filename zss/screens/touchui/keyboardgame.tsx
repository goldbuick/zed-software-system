import { useDeviceData, useWriteText } from 'zss/gadget/hooks'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

import { ToggleKey } from './togglekey'

type KeyboardGameProps = {
  width: number
  height: number
}

export function KeyboardGame({ width, height }: KeyboardGameProps) {
  const context = useWriteText()
  const { keyboardalt, keyboardctrl, keyboardshift } = useDeviceData()
  const left = width - 18
  const mid = width - 12
  const right = width - 6

  const top = 1
  const bottom = height - 5

  const x = right - 5
  const y = bottom - 2
  const center = Math.round(width * 0.5) - 3

  for (let i = 0; i < 5; ++i) {
    context.x = x
    context.y = y + i
    tokenizeandwritetextformat(
      `$178$178$178$178$178$178$178$178$178`,
      context,
      false,
    )
  }

  context.x = x + 2
  context.y = y
  tokenizeandwritetextformat('shoot', context, false)

  return (
    <>
      <ToggleKey
        x={1}
        y={top}
        letters={keyboardctrl ? 'CTRL' : 'ctrl'}
        onToggle={() => {
          useDeviceData.setState({ keyboardctrl: !keyboardctrl })
        }}
      />
      <ToggleKey
        x={7}
        y={top + 1}
        letters={keyboardalt ? 'ALT' : 'alt'}
        onToggle={() => {
          useDeviceData.setState({ keyboardalt: !keyboardalt })
        }}
      />
      <ToggleKey
        x={13}
        y={top}
        letters={keyboardshift ? 'SHIFT' : 'shift'}
        onToggle={() => {
          useDeviceData.setState({ keyboardshift: !keyboardshift })
        }}
      />
      <ToggleKey
        x={left}
        y={top}
        letters="menu"
        onToggle={() => {
          // user.keyboard('[Tab]').catch(noop)
        }}
      />
      <ToggleKey
        x={mid}
        y={top + 1}
        letters="okay"
        onToggle={() => {
          // user.keyboard('[Enter]').catch(noop)
        }}
      />
      <ToggleKey
        x={right}
        y={top}
        letters="cancel"
        onToggle={() => {
          // user.keyboard('[Escape]').catch(noop)
        }}
      />
      <ToggleKey
        x={1}
        y={bottom - 1}
        letters="?"
        onToggle={() => {
          // user.keyboard('{Shift>}?{/Shift}').catch(noop)
        }}
      />
      <ToggleKey
        x={7}
        y={bottom}
        letters="#"
        onToggle={() => {
          // user.keyboard('3').catch(noop)
        }}
      />
      <ToggleKey
        x={13}
        y={bottom - 1}
        letters="c"
        onToggle={() => {
          // user.keyboard('c').catch(noop)
        }}
      />
      <ToggleKey
        x={center}
        y={top}
        letters="$24"
        onToggle={() => {
          // user.keyboard('c').catch(noop)
        }}
      />
      <ToggleKey
        x={center}
        y={bottom}
        letters="$25"
        onToggle={() => {
          // user.keyboard('c').catch(noop)
        }}
      />
      <ToggleKey
        x={width - 6}
        y={6}
        letters="$26"
        onToggle={() => {
          // user.keyboard('c').catch(noop)
        }}
      />
      <ToggleKey
        x={0}
        y={6}
        letters="$27"
        onToggle={() => {
          // user.keyboard('c').catch(noop)
        }}
      />
    </>
  )
}
