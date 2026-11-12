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

/** Hidden row hit target: tap moves the cursor. `ontap` runs only when that row is already active. */
export function LinkTapTarget({ surface, area, ontap }: LinkTapTargetProps) {
  const handletap = useCallback(() => {
    surface.setcursor?.(surface.striperow)
    if (surface.active) {
      ontap?.()
    }
  }, [surface, ontap])

  if (!linkallowhotkeys(surface)) {
    return null
  }

  return (
    <Rect
      visible={false}
      blocking
      cursor="pointer"
      x={area.x}
      y={area.y}
      z={1}
      width={area.width}
      height={area.height}
      onPointerDown={handletap}
    />
  )
}
