import { MQ_CANVAS_HEIGHT, MQ_CANVAS_WIDTH } from '../tvcanvas'

import { CLASSIC_BG, drawartwork } from './classicshared'

/**
 * Tame washed MilkDrop WebGL frames for board TV: mild crush + contrast.
 * Kept bright enough that the later VHS pass does not crush the image.
 * Viz blits opaque; cover art (if any) is a semi-transparent overlay on top.
 */
export function blitvizcontrast(
  dest: CanvasRenderingContext2D,
  source: CanvasImageSource,
  artwork?: HTMLImageElement | null,
) {
  dest.filter = 'none'
  dest.globalAlpha = 1
  dest.fillStyle = CLASSIC_BG
  dest.fillRect(0, 0, MQ_CANVAS_WIDTH, MQ_CANVAS_HEIGHT)
  dest.filter = 'brightness(0.92) contrast(1.45) saturate(1.35)'
  dest.drawImage(source, 0, 0, MQ_CANVAS_WIDTH, MQ_CANVAS_HEIGHT)
  dest.filter = 'none'
  if (artwork) {
    drawartwork(dest, artwork)
  }
}
