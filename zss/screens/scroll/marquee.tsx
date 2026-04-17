import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
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
  const offset = useRef(0)

  fillmarqueebuffer(
    context,
    content,
    contentmax,
    leftedge,
    margin,
    rightedge,
    offset.current,
    y,
  )

  useFrame((_, delta) => {
    acc.current += delta
    if (acc.current < SCROLL_SPEED) {
      return
    }
    acc.current %= SCROLL_SPEED
    offset.current = (offset.current - 1) % contentmax
    fillmarqueebuffer(
      context,
      content,
      contentmax,
      leftedge,
      margin,
      rightedge,
      offset.current,
      y,
    )
  })

  return null
}
