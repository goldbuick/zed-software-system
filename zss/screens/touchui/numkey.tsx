import { user } from 'zss/feature/keyboard'
import { useDeviceData, useWriteText } from 'zss/gadget/hooks'
import { noop } from 'zss/mapping/types'
import { ismac } from 'zss/words/system'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

import { TouchPlane } from './touchplane'

type NumKeyProps = {
  x: number
  y: number
  letters: string
  digit: string
  usealt?: boolean
  usectrl?: boolean
}

const CtrlKey = ismac ? 'Meta' : 'Ctrl'

export function NumKey({ x, y, letters, digit, usealt, usectrl }: NumKeyProps) {
  const context = useWriteText()
  const { keyboardshift, keyboardctrl, keyboardalt } = useDeviceData()

  context.x = x
  context.y = y
  tokenizeandwritetextformat(`$219$219$219$219$219`, context, false)
  context.x = x
  context.y = y + 1
  tokenizeandwritetextformat(`$219$178$178$178$219`, context, false)
  context.x = x
  context.y = y + 2
  tokenizeandwritetextformat(`$219$219$219$219$219`, context, false)

  if (letters) {
    context.x =
      x + (letters.startsWith('$') ? 2 : Math.round(2.5 - letters.length * 0.5))
    context.y = y
    tokenizeandwritetextformat(
      keyboardshift ? letters.toUpperCase() : letters.toLowerCase(),
      context,
      false,
    )
  }

  if (digit.trim().length === 1) {
    context.x = x + 2
    context.y = y + 2
    const content = digit === '$' ? '$$' : digit
    tokenizeandwritetextformat(
      keyboardshift ? content.toUpperCase() : content.toLowerCase(),
      context,
      false,
    )
  }

  return (
    <TouchPlane
      x={x}
      y={y}
      width={5}
      height={3}
      onPointerDown={() => {
        let keypress = ''
        if (keyboardalt && usealt) {
          keypress += `{Alt>}`
        }
        if (keyboardctrl && usectrl) {
          keypress += `{${CtrlKey}>}`
        }
        if (keyboardshift) {
          keypress += `{Shift>}`
        }
        keypress +=
          digit.length === 1
            ? digit.replace('[', '[[').replace('{', '{{')
            : digit
        if (keyboardalt && usealt) {
          keypress += `{/Alt}`
        }
        if (keyboardctrl && usectrl) {
          keypress += `{/${CtrlKey}}`
        }
        if (keyboardshift) {
          keypress += `{/Shift}`
        }
        user.keyboard(keypress).catch(noop)
      }}
    />
  )
}
