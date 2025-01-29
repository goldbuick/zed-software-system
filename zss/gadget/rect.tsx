import React from 'react'
import { Mesh as Mesh_ } from 'three'
import { RUNTIME } from 'zss/config'

import { useClipping } from './clipping'

function noop() {}

type Args<T> = T extends new (...args: any) => any
  ? ConstructorParameters<T>
  : T
type ShapeProps<T> = Omit<JSX.IntrinsicElements['mesh'], 'args'> & {
  args?: Args<T>
}

const PlaneComponent = React.forwardRef(function Plane(
  { args, children, ...props }: ShapeProps<typeof Plane>,
  fref: React.ForwardedRef<Mesh_>,
) {
  const ref = React.useRef<Mesh_>(null!)
  React.useImperativeHandle(fref, () => ref.current)
  return (
    <mesh ref={ref} {...props}>
      <planeGeometry attach="geometry" args={args} />
      {children}
    </mesh>
  )
})

type Props = {
  blocking?: boolean
  cursor?: string
  x?: number
  y?: number
  width?: number
  height?: number
  opacity?: number
  visible?: boolean
} & React.ComponentProps<typeof PlaneComponent>

export const Rect = React.forwardRef<typeof PlaneComponent, Props>(
  function Rect(
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
      (x + hw) * RUNTIME.DRAW_CHAR_WIDTH(),
      (y + hh) * RUNTIME.DRAW_CHAR_HEIGHT(),
      0,
    ]
    const clippingPlanes = useClipping()
    return (
      <PlaneComponent
        ref={forwardedRef}
        args={[
          width * RUNTIME.DRAW_CHAR_WIDTH(),
          height * RUNTIME.DRAW_CHAR_HEIGHT(),
        ]}
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
      </PlaneComponent>
    )
  },
)
