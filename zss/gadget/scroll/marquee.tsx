import { useEffect, useState } from 'react'
import {
  tokenizeandmeasuretextformat,
  tokenizeandwritetextformat,
  WRITE_TEXT_CONTEXT,
} from 'zss/words/textformat'
import { COLOR } from 'zss/words/types'

import { useBlink } from '../hooks'

type MarqueeProps = {
  line: string
  color: COLOR
  margin: number
  context: WRITE_TEXT_CONTEXT
}

export function Marquee({ line, color, margin, context }: MarqueeProps) {
  // we assume context is setup
  const blink = useBlink()

  // measure line
  const strcolor = COLOR[color] ?? ''
  const content = `$${strcolor.toLowerCase()} ${line.replaceAll('\n', '').trim()} --=--`
  const measure = tokenizeandmeasuretextformat(content, 10000, 1)
  const contentmax = measure?.measuredwidth ?? 1

  // keep old values
  const rightedge = context.active.rightedge ?? 0

  // moves offset along
  const [offset, setoffset] = useState(0)
  useEffect(() => {
    setoffset((state) => {
      if (blink) {
        return state
      }
      return (state - 1) % contentmax
    })
  }, [blink, contentmax])

  // cycle line if too long
  context.disablewrap = true
  context.active.leftedge = margin
  context.active.rightedge = rightedge - margin

  // render to fill it out
  for (let start = margin + offset; start < rightedge; start += contentmax) {
    context.x = start
    context.y = 0
    tokenizeandwritetextformat(content, context, false)
  }

  // reset values
  context.active.leftedge = 0
  context.active.rightedge = rightedge
  context.disablewrap = false

  return null
}
