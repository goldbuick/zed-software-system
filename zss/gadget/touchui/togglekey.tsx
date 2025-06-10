import { tokenizeandwritetextformat } from 'zss/words/textformat'

import { useWriteText } from '../hooks'

import { TouchPlane } from './touchplane'

type ToggleKeyProps = {
  x: number
  y: number
  letters: string
  onToggle: () => void
}

export function ToggleKey({ x, y, letters, onToggle }: ToggleKeyProps) {
  const context = useWriteText()

  context.x = x
  context.y = y
  tokenizeandwritetextformat(`$178$178$178$178$178`, context, false)
  context.x = x
  context.y = y + 1
  tokenizeandwritetextformat(`$178$178$178$178$178`, context, false)
  context.x = x
  context.y = y + 2
  tokenizeandwritetextformat(`$178$178$178$178$178`, context, false)

  if (letters) {
    context.x = x + Math.round(2.5 - letters.length * 0.5)
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
      }}
    />
  )
}
