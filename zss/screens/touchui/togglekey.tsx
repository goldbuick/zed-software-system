import { useCallback, useState } from 'react'
import { useWriteText } from 'zss/gadget/hooks'
import {
  tokenizeandmeasuretextformat,
  tokenizeandwritetextformat,
} from 'zss/words/textformat'

import { TouchPlane } from './touchplane'

type ToggleKeyProps = {
  x: number
  y: number
  letters: string
  onToggle: () => void
}

export function ToggleKey({ x, y, letters, onToggle }: ToggleKeyProps) {
  const context = useWriteText()
  const [pressed, setpressed] = useState(false)
  const setnotpressed = useCallback(() => setpressed(false), [setpressed])

  context.x = x
  context.y = y
  tokenizeandwritetextformat(
    pressed ? `$176$176$176$176$176` : `$178$178$178$178$178`,
    context,
    false,
  )
  context.x = x
  context.y = y + 1
  tokenizeandwritetextformat(
    pressed ? `$176$177$177$177$176` : `$178$177$177$177$178`,
    context,
    false,
  )
  context.x = x
  context.y = y + 2
  tokenizeandwritetextformat(
    pressed ? `$176$176$176$176$176` : `$178$178$178$178$178`,
    context,
    false,
  )

  if (letters) {
    const result = tokenizeandmeasuretextformat(letters, 10000, 1)
    const measuredwidth = result?.measuredwidth ?? letters.length
    context.x = x + Math.round(2.5 - measuredwidth * 0.5)
    context.y = y
    tokenizeandwritetextformat(letters, context, false)
  }

  return (
    <TouchPlane
      x={x}
      y={y}
      width={5}
      height={3}
      onPointerDown={() => {
        onToggle()
        setpressed(true)
      }}
      onPointerUp={setnotpressed}
      onPointerLeave={setnotpressed}
      onPointerCancel={setnotpressed}
    />
  )
}
