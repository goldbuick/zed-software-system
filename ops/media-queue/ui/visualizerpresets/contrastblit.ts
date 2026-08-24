import { MQ_CANVAS_HEIGHT, MQ_CANVAS_WIDTH } from '../tvcanvas'

import { CLASSIC_BG, drawartwork } from './classicshared'

/**
 * Pull washed WebGL frames down for board TV: crush highlights first, then
 * punch contrast. Plain contrast() on near-white content stays white.
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
  dest.filter = 'brightness(0.55) contrast(1.85) saturate(1.55)'
  dest.drawImage(source, 0, 0, MQ_CANVAS_WIDTH, MQ_CANVAS_HEIGHT)
  dest.filter = 'none'
  if (artwork) {
    drawartwork(dest, artwork)
  }
}
