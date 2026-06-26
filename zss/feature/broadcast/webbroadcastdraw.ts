import type { DrawRegion, VideoComposition } from 'zss/feature/broadcast/webbroadcasttypes'

type ImageLikeElement = {
  width: number
  height: number
}

/** Letterboxed draw region mirroring IVS SDK getDrawRegion behavior. */
export function computedrawregion(
  position: VideoComposition,
  canvaswidth: number,
  canvasheight: number,
  element: ImageLikeElement,
): DrawRegion {
  let x = position.x ?? 0
  let y = position.y ?? 0
  const regionwidth = position.width ?? canvaswidth - x
  const regionheight = position.height ?? canvasheight - y
  const targetaspect = regionwidth / regionheight

  let sourcewidth = element.width
  let sourceheight = element.height
  const sourceaspect = sourcewidth / sourceheight

  let drawwidth = regionwidth
  let drawheight = regionheight

  if (sourceaspect > targetaspect) {
    drawwidth = regionwidth
    drawheight = 2 * Math.round(regionwidth / sourceaspect / 2)
    y += (regionheight - drawheight) / 2
  } else if (sourceaspect < targetaspect) {
    drawheight = regionheight
    drawwidth = 2 * Math.round((regionheight * sourceaspect) / 2)
    x += (regionwidth - drawwidth) / 2
  }

  return { x, y, width: drawwidth, height: drawheight }
}
