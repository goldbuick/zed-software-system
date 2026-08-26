import { MQ_CANVAS_HEIGHT, MQ_CANVAS_WIDTH } from '../tvcanvas'

import { VIZ_BG, VIZ_OVER_ARTWORK_ALPHA, drawartwork } from './vizshared'

/**
 * Blit MilkDrop WebGL frames for board TV with mild contrast punch.
 * Cover art (if any) is a desaturated underlay; viz is slightly translucent
 * so the silhouette still reads through.
 */
export function blitvizcontrast(
  dest: CanvasRenderingContext2D,
  source: CanvasImageSource,
  artwork?: HTMLImageElement | null,
) {
  dest.filter = 'none'
  dest.globalAlpha = 1
  dest.globalCompositeOperation = 'source-over'
  dest.fillStyle = VIZ_BG
  dest.fillRect(0, 0, MQ_CANVAS_WIDTH, MQ_CANVAS_HEIGHT)
  if (artwork) {
    drawartwork(dest, artwork)
  }
  dest.filter = 'brightness(1.2) contrast(1) saturate(1)'
  dest.globalAlpha = artwork ? VIZ_OVER_ARTWORK_ALPHA : 1
  dest.drawImage(source, 0, 0, MQ_CANVAS_WIDTH, MQ_CANVAS_HEIGHT)
  dest.globalAlpha = 1
  dest.filter = 'none'
}
