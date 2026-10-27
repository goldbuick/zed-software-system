import type { LinkSurface } from './types'

export type LINK_TAP_AREA = {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Hit area for the row `linkbegin` positioned. Call after the widget writes
 * its row text so wrapped terminal rows cover every line they used.
 */
export function readlinktaparea(surface: LinkSurface): LINK_TAP_AREA {
  const { context } = surface
  if (surface.layout === 'terminal') {
    const left = context.active.leftedge ?? 0
    const right = context.active.rightedge ?? context.width - 1
    const top = (context.active.topedge ?? 0) + surface.row
    const bottom = context.x > left ? context.y + 1 : context.y
    return {
      x: left,
      y: top,
      width: right - left + 1,
      height: Math.max(1, bottom - top),
    }
  }
  const x = surface.sidebar ? 1 : 0
  return { x, y: surface.row, width: context.width - x, height: 1 }
}
