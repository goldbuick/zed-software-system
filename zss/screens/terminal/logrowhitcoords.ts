/** Pure cursor hit-test over fixed pin rows and scrolled session rows. */
export function findterminalrowindexfromcoords(args: {
  tapeycursor: number
  scroll: number
  pinycoords: number[]
  pinheights: number[]
  sessionycoords: number[]
  sessionheights: number[]
}): number | undefined {
  const {
    tapeycursor,
    scroll,
    pinycoords,
    pinheights,
    sessionycoords,
    sessionheights,
  } = args
  for (let index = 0; index < pinheights.length; ++index) {
    const y = pinycoords[index]
    const yheight = pinheights[index]
    const ybottom = y + yheight
    if (tapeycursor >= y && tapeycursor < ybottom) {
      return index
    }
  }
  for (let index = 0; index < sessionheights.length; ++index) {
    const y = sessionycoords[index] + scroll
    const yheight = sessionheights[index]
    const ybottom = y + yheight
    if (tapeycursor >= y && tapeycursor < ybottom) {
      return pinheights.length + index
    }
  }
  return undefined
}
