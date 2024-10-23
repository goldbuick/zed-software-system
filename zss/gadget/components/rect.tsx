import { Plane } from '@react-three/drei'
import React from 'react'
import { DRAW_CHAR_HEIGHT, DRAW_CHAR_WIDTH } from 'zss/gadget/data/types'

import { useClipping } from './clipping'

function noop() {}

type Props = {
  blocking?: boolean
  cursor?: string
  x?: number
  y?: number
  width?: number
  height?: number
  opacity?: number
  visible?: boolean
} & React.ComponentProps<typeof Plane>

export const Rect = React.forwardRef<typeof Plane, Props>(function Rect(
  {
    blocking = false,
    cursor = 'default',
    x = 0,
    y = 0,
    width = 1,
    height = 1,
    opacity = 1,
    visible = true,
    ...props
  }: Props,
  forwardedRef,
) {
  const hw = width * 0.5
  const hh = height * 0.5
  const position: [number, number, number] = [
    (x + hw) * DRAW_CHAR_WIDTH,
    (y + hh) * DRAW_CHAR_HEIGHT,
    0,
  ]
  const clippingPlanes = useClipping()
  return (
    <Plane
      ref={forwardedRef}
      args={[width * DRAW_CHAR_WIDTH, height * DRAW_CHAR_HEIGHT]}
      userData={{ blocking, cursor, clippingPlanes }}
      onClick={blocking ? noop : undefined}
      onPointerMove={blocking ? noop : undefined}
      position={position}
      {...props}
    >
      <meshBasicMaterial
        color="white"
        opacity={opacity}
        visible={visible}
        transparent={opacity !== 1}
        clippingPlanes={clippingPlanes}
      />
    </Plane>
  )
})
