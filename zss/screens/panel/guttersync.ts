import type { WRITE_TEXT_CONTEXT } from 'zss/words/textformat'

/**
 * Sidebar gutter (`reset.leftedge - 1`) copies fg/bg from the first content column
 * (`reset.leftedge`) for each row touched. Only when `padlineright` (panel tiles).
 */
export function syncpanelguttercolumn(
  context: WRITE_TEXT_CONTEXT,
  y0: number,
  yend: number,
) {
  if (context.padlineright !== true || context.measureonly === true) {
    return
  }
  const contentx = context.reset.leftedge ?? 0
  if (contentx <= 0) {
    return
  }
  const gx = contentx - 1
  const top = context.reset.topedge ?? 0
  const bottom = context.reset.bottomedge ?? context.height - 1
  const ylo = Math.min(y0, yend)
  const yhi = Math.max(y0, yend)
  for (let yy = Math.max(ylo, top); yy <= Math.min(yhi, bottom); ++yy) {
    const si = contentx + yy * context.width
    const di = gx + yy * context.width
    context.color[di] = context.color[si]
    context.bg[di] = context.bg[si]
  }
  context.changed()
}
