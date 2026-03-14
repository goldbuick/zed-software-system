import { useFrame } from '@react-three/fiber'
import { useRef, useState } from 'react'
import { useWriteText } from 'zss/gadget/writetext'
import {
  SCROLL_SPEED,
  fillmarqueebuffer,
  measuremarqueeline,
} from 'zss/screens/scroll/marqueebuffer'
import { COLOR } from 'zss/words/types'

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
  const context = useWriteText()
  const { content, contentmax } = measuremarqueeline(line, color)

  const acc = useRef(0)
  const [offset, setoffset] = useState(0)
  useFrame((_, delta) => {
    acc.current += delta
    if (acc.current >= SCROLL_SPEED) {
      acc.current %= SCROLL_SPEED
      setoffset((state) => (state - 1) % contentmax)
    }
  })

  fillmarqueebuffer(
    context,
    content,
    contentmax,
    leftedge,
    margin,
    rightedge,
    offset,
    y,
  )

  return null
}
