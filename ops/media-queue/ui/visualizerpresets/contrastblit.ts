import { MQ_CANVAS_HEIGHT, MQ_CANVAS_WIDTH } from '../tvcanvas'

/**
 * Pull washed WebGL frames down for board TV: crush highlights first, then
 * punch contrast. Plain contrast() on near-white content stays white.
 */
export function blitvizcontrast(
  dest: CanvasRenderingContext2D,
  source: CanvasImageSource,
) {
  dest.filter = 'brightness(0.55) contrast(1.85) saturate(1.55)'
  dest.drawImage(source, 0, 0, MQ_CANVAS_WIDTH, MQ_CANVAS_HEIGHT)
  dest.filter = 'none'
}
