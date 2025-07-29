import { user } from 'zss/feature/keyboard'
import { noop } from 'zss/mapping/types'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

import { useDeviceData, useWriteText } from '../hooks'

import { NumKey } from './numkey'
import { ToggleKey } from './togglekey'
import { TouchPlane } from './touchplane'

type KeyboardGameProps = {
  width: number
}

export function KeyboardGame({ width }: KeyboardGameProps) {
  const context = useWriteText()
  const { keyboardalt, keyboardctrl, keyboardshift } = useDeviceData()
  const left = width - 18
  const mid = width - 12
  const right = width - 6

  const center = Math.round(width * 0.5) - 3
  const x = right
  const y = 12

  context.x = x
  context.y = y
  tokenizeandwritetextformat(`$178$178$178$178$178`, context, false)
  context.x = x
  context.y = y + 1
  tokenizeandwritetextformat(`$178$177$177$177$178`, context, false)
  context.x = x
  context.y = y + 2
  tokenizeandwritetextformat(`$178$178$178$178$178`, context, false)

  const letters = 'shoot'
  context.x = x + Math.round(2.5 - letters.length * 0.5)
  context.y = y
  tokenizeandwritetextformat(letters, context, false)

  function clearshift() {
    user.keyboard('{/Shift}').catch(noop)
  }

  return (
    <>
      <ToggleKey
        x={1}
        y={0}
        letters={keyboardctrl ? 'CTRL' : 'ctrl'}
        onToggle={() => {
          useDeviceData.setState({ keyboardctrl: !keyboardctrl })
        }}
      />
      <ToggleKey
        x={7}
        y={1}
        letters={keyboardalt ? 'ALT' : 'alt'}
        onToggle={() => {
          useDeviceData.setState({ keyboardalt: !keyboardalt })
        }}
      />
      <ToggleKey
        x={13}
        y={0}
        letters={keyboardshift ? 'SHIFT' : 'shift'}
        onToggle={() => {
          useDeviceData.setState({ keyboardshift: !keyboardshift })
        }}
      />
      <ToggleKey
        x={left}
        y={0}
        letters="menu"
        onToggle={() => {
          user.keyboard('[Tab]').catch(noop)
        }}
      />
      <ToggleKey
        x={mid}
        y={1}
        letters="okay"
        onToggle={() => {
          user.keyboard('[Enter]').catch(noop)
        }}
      />
      <ToggleKey
        x={right}
        y={0}
        letters="cancel"
        onToggle={() => {
          user.keyboard('[Escape]').catch(noop)
        }}
      />
      <ToggleKey
        x={1}
        y={12}
        letters="?"
        onToggle={() => {
          user.keyboard('{Shift>}?{/Shift}').catch(noop)
        }}
      />
      <ToggleKey
        x={7}
        y={13}
        letters="#"
        onToggle={() => {
          user.keyboard('3').catch(noop)
        }}
      />
      <ToggleKey
        x={13}
        y={12}
        letters="t"
        onToggle={() => {
          user.keyboard('t').catch(noop)
        }}
      />

      <NumKey x={center} y={0} letters="$24" digit="[ArrowUp]" usealt />
      <NumKey x={center} y={13} letters="$25" digit="[ArrowDown]" usealt />
      <NumKey
        x={width - 6}
        y={6}
        letters="$26"
        digit="[ArrowRight]"
        usealt
        usectrl
      />
      <NumKey x={0} y={6} letters="$27" digit="[ArrowLeft]" usealt usectrl />

      <TouchPlane
        x={right}
        y={12}
        width={5}
        height={3}
        onPointerDown={() => {
          user.keyboard('{Shift>}').catch(noop)
        }}
        onPointerUp={clearshift}
        onPointerLeave={clearshift}
        onPointerCancel={clearshift}
      />
    </>
  )
}
