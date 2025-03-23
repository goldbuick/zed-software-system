import { useEffect, useState } from 'react'
import {
  tokenizeandmeasuretextformat,
  tokenizeandwritetextformat,
  WRITE_TEXT_CONTEXT,
} from 'zss/words/textformat'

import { useBlink } from '../hooks'

type MarqueeProps = {
  line: string
  context: WRITE_TEXT_CONTEXT
}

export function Marquee({ line, context }: MarqueeProps) {
  // we assume context is setup
  const blink = useBlink()

  // measure line
  const content = `$blue ${line.replaceAll('\n', '').trim()}`
  const measure = tokenizeandmeasuretextformat(content, 10000, 1)
  const contentmax = measure?.measuredwidth ?? 1

  // keep old values
  const rightedge = context.active.rightedge ?? 0

  // moves offset along
  const [offset, setoffset] = useState(0)
  useEffect(() => {
    setoffset((state) => (state - 1) % contentmax)
  }, [blink, contentmax])

  // cycle line if too long
  context.disablewrap = true
  context.active.leftedge = 3
  context.active.rightedge = rightedge - 3

  context.x = 3 + offset
  context.y = 0
  tokenizeandwritetextformat(content, context, false)

  context.x = 3 + offset + contentmax
  context.y = 0
  tokenizeandwritetextformat(content, context, true)

  // reset values
  context.active.leftedge = 0
  context.active.rightedge = rightedge
  context.disablewrap = false

  return null
}
