import React from 'react'
import { Color, Mesh } from 'three'
import { RUNTIME } from 'zss/config'

function noop() {}

type Args<T> = T extends new (...args: any) => any
  ? ConstructorParameters<T>
  : T
type ShapeProps<T> = Omit<JSX.IntrinsicElements['mesh'], 'args'> & {
  args?: Args<T>
}

const PlaneComponent = React.forwardRef(function Plane(
  { args, children, ...props }: ShapeProps<typeof Plane>,
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
} & React.ComponentProps<typeof PlaneComponent>

export const Rect = React.forwardRef<typeof PlaneComponent, Props>(
  function Rect(
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
        userData={{ blocking, cursor }}
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
        />
      </PlaneComponent>
    )
  },
)
