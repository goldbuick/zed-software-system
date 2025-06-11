import { tokenizeandwritetextformat } from 'zss/words/textformat'

import { useWriteText } from '../hooks'

import { TouchPlane } from './touchplane'

type NumKeyProps = {
  x: number
  y: number
  letters: string
  onClick: () => void
}

export function WordPlane({ x, y, letters, onClick }: NumKeyProps) {
  const context = useWriteText()

  context.x = x
  context.y = y
  tokenizeandwritetextformat(letters, context, false)

  return (
    <TouchPlane
      x={x - 1}
      y={y - 1}
      width={letters.length + 2}
      height={3}
      onPointerDown={onClick}
    />
  )
}
