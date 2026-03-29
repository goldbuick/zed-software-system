import type { WRITE_TEXT_CONTEXT } from 'zss/words/textformat'
import {
  tokenizeandmeasuretextformat,
  tokenizeandwritetextformat,
  writetextreset,
} from 'zss/words/textformat'
import { COLOR } from 'zss/words/types'

export const SCROLL_SPEED = 0.5

/** Write marquee content into context at given offset; used by ScrollMarquee and toast one-time fill. */
export function fillmarqueebuffer(
  context: WRITE_TEXT_CONTEXT,
  content: string,
  contentmax: number,
  leftedge: number,
  margin: number,
  rightedge: number,
  offset: number,
  y: number,
) {
  context.disablewrap = true
  context.active.leftedge = margin
  context.active.rightedge = rightedge - margin
  for (
    let start = leftedge + margin + offset;
    start <= rightedge;
    start += contentmax
  ) {
    context.x = start
    context.y = y
    tokenizeandwritetextformat(content, context, false)
  }
  context.active.leftedge = 0
  context.active.rightedge = rightedge
  context.disablewrap = false
  writetextreset(context)
}

export function measuremarqueeline(line: string, color: COLOR) {
  const strcolor = COLOR[color] ?? ''
  const content = `$${strcolor.toLowerCase()}${line.replaceAll('\n', '').trim()}`
  const measure = tokenizeandmeasuretextformat(content, 10000, 1)
  const contentmax = measure?.measuredwidth ?? 1
  return { content, contentmax }
}
