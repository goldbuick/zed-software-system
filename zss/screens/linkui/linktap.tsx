import { useCallback } from 'react'
import { Rect } from 'zss/gadget/rect'

import type { LINK_TAP_AREA } from './linktaparea'
import { linkallowhotkeys } from './surface'
import type { LinkSurface } from './types'

type LinkTapTargetProps = {
  surface: LinkSurface
  area: LINK_TAP_AREA
  ontap?: () => void
}

/**
 * Activate-only hit target when the row is already selected by the container.
 * Row select lives on Terminal / Scroll / Sidebar via RowSelectHit.
 */
export function LinkTapTarget({ surface, area, ontap }: LinkTapTargetProps) {
  const handleactivate = useCallback(() => {
    ontap?.()
  }, [ontap])

  const allowtaps =
    surface.layout === 'panel' || linkallowhotkeys(surface)
  if (!allowtaps || !ontap || !surface.active) {
    return null
  }

  return (
    <Rect
      visible
      opacity={0}
      blocking
      cursor="pointer"
      x={area.x}
      y={area.y}
      z={2}
      width={area.width}
      height={area.height}
      onPointerDown={handleactivate}
    />
  )
}
