import React from 'react'
import { Color, Mesh, PlaneGeometry } from 'three'
import { RUNTIME } from 'zss/config'
import { noraycastmesh } from 'zss/gadget/noraycastmesh'

function noop() {}

type ShapeProps = Omit<React.JSX.IntrinsicElements['mesh'], 'args'> & {
  args?: ConstructorParameters<typeof PlaneGeometry>
}

const PlaneComponent = React.forwardRef(function Plane(
  { args, children, ...props }: ShapeProps,
  fref: React.ForwardedRef<Mesh>,
) {
  const ref = React.useRef<Mesh>(null!)
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
  z?: number
  width?: number
  height?: number
  opacity?: number
  visible?: boolean
  color?: Color | string
  /** When true, this mesh is omitted from raycasting (e.g. visual overlays above a pick plane). */
  skipraycast?: boolean
  /** Marks the gadget inspector hit sheet so pointer code can pick the right intersection. */
  inspectpick?: boolean
} & React.ComponentProps<typeof PlaneComponent>

export const Rect = React.forwardRef<Mesh, Props>(function Rect(
  {
    blocking = false,
    cursor = 'default',
    x = 0,
    y = 0,
    z = 0,
    width = 1,
    height = 1,
    opacity = 1,
    visible = true,
    color = 'white',
    skipraycast = false,
    inspectpick = false,
    ...props
  }: Props,
  forwardedRef,
) {
  const hw = width * 0.5
  const hh = height * 0.5
  const position: [number, number, number] = [
    (x + hw) * RUNTIME.DRAW_CHAR_WIDTH(),
    (y + hh) * RUNTIME.DRAW_CHAR_HEIGHT(),
    z,
  ]
  return (
    <PlaneComponent
      ref={forwardedRef}
      args={[
        width * RUNTIME.DRAW_CHAR_WIDTH(),
        height * RUNTIME.DRAW_CHAR_HEIGHT(),
      ]}
      raycast={skipraycast ? noraycastmesh : undefined}
      userData={{
        blocking,
        cursor,
        ...(inspectpick ? { inspectpick: true as const } : {}),
      }}
      onClick={blocking ? noop : undefined}
      onPointerMove={blocking ? noop : undefined}
      position={position}
      {...props}
    >
      <meshBasicMaterial
        color={color}
        opacity={opacity}
        visible={visible}
        transparent={opacity !== 1}
        depthWrite={opacity === 1}
      />
    </PlaneComponent>
  )
})
