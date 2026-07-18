/** Pure cursor hit-test: sticky pins paint on top, then scrolled session rows. */
export function findterminalrowindexfromcoords(args: {
  tapeycursor: number
  scroll: number
  pinycoords: number[]
  pinheights: number[]
  sessionycoords: number[]
  sessionheights: number[]
  /** First Y below sticky pin band; session rows at/above this are clipped. */
  pinbandbottom: number
}): number | undefined {
  const {
    tapeycursor,
    scroll,
    pinycoords,
    pinheights,
    sessionycoords,
    sessionheights,
    pinbandbottom,
  } = args
  // Pin band wins overlap (CSS sticky paints on top)
  for (let index = 0; index < pinheights.length; ++index) {
    const y = pinycoords[index]
    const yheight = pinheights[index]
    const ybottom = y + yheight
    if (tapeycursor >= y && tapeycursor < ybottom) {
      return sessionheights.length + index
    }
  }
  for (let index = 0; index < sessionheights.length; ++index) {
    const y = sessionycoords[index] + scroll
    const yheight = sessionheights[index]
    const ybottom = y + yheight
    if (ybottom <= pinbandbottom) {
      continue
    }
    if (tapeycursor >= y && tapeycursor < ybottom) {
      return index
    }
  }
  return undefined
}
