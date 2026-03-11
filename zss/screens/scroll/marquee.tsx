import { useFrame } from '@react-three/fiber'
import { useRef, useState } from 'react'
import { useWriteText } from 'zss/gadget/writetext'
import {
  tokenizeandmeasuretextformat,
  tokenizeandwritetextformat,
} from 'zss/words/textformat'
import { COLOR } from 'zss/words/types'

const SCROLL_SPEED = 0.5

type ScrollMarqueeProps = {
  line: string
  color: COLOR
  margin: number
  y: number
  leftedge: number
  rightedge: number
}

export function ScrollMarquee({
  line,
  color,
  margin,
  y,
  leftedge,
  rightedge,
}: ScrollMarqueeProps) {
  // we assume context is setup
  const context = useWriteText()

  // measure line
  const strcolor = COLOR[color] ?? ''
  const content = `$${strcolor.toLowerCase()}${line.replaceAll('\n', '').trim()}`
  const measure = tokenizeandmeasuretextformat(content, 10000, 1)
  const contentmax = measure?.measuredwidth ?? 1

  // moves offset along
  const acc = useRef(0)
  const [offset, setoffset] = useState(0)
  useFrame((_, delta) => {
    acc.current += delta
    if (acc.current >= SCROLL_SPEED) {
      acc.current %= SCROLL_SPEED
      setoffset((state) => (state - 1) % contentmax)
    }
  })

  // cycle line if too long
  context.disablewrap = true
  context.active.leftedge = margin
  context.active.rightedge = rightedge - margin

  // render to fill it out
  for (
    let start = leftedge + margin + offset;
    start <= rightedge;
    start += contentmax
  ) {
    context.x = start
    context.y = y
    tokenizeandwritetextformat(content, context, false)
  }

  // reset values
  context.active.leftedge = 0
  context.active.rightedge = rightedge
  context.disablewrap = false

  return null
}
