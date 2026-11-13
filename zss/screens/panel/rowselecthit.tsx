import type { ThreeEvent } from '@react-three/fiber'
import { Rect } from 'zss/gadget/rect'

type RowSelectHitProps = {
  x: number
  y: number
  width: number
  height: number
  onselect: () => void
  z?: number
}

/** Invisible row hit target: container-owned select (not Link activate). */
export function RowSelectHit({
  x,
  y,
  width,
  height,
  onselect,
  z = 1,
}: RowSelectHitProps) {
  function handlepointerdown(e: ThreeEvent<PointerEvent>) {
    onselect()
    // R3F captures on down; release so drag can hit sibling row meshes.
    const el = e.target as unknown as {
      releasePointerCapture?: (id: number) => void
    }
    el.releasePointerCapture?.(e.pointerId)
  }

  function handlepointerenter(e: ThreeEvent<PointerEvent>) {
    if (e.buttons & 1) {
      onselect()
    }
  }

  return (
    <Rect
      // Keep object/material ray-pickable; cafe event filter drops object.visible=false.
      visible
      opacity={0}
      blocking
      cursor="pointer"
      x={x}
      y={y}
      z={z}
      width={width}
      height={height}
      onPointerDown={handlepointerdown}
      onPointerEnter={handlepointerenter}
    />
  )
}
