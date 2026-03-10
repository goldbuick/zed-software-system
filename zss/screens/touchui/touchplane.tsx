import { Plane } from '@react-three/drei'
import { EventHandlers } from '@react-three/fiber'
import { RUNTIME } from 'zss/config'

type ButtonProps = {
  x?: number
  y?: number
  width: number
  height: number
  debug?: boolean
} & EventHandlers

export function TouchPlane({
  x,
  y,
  width,
  height,
  debug,
  ...props
}: ButtonProps) {
  const drawcharwidth = RUNTIME.DRAW_CHAR_WIDTH()
  const drawcharheight = RUNTIME.DRAW_CHAR_HEIGHT()
  return (
    <Plane
      {...props}
      args={[width * drawcharwidth, height * drawcharheight]}
      position={[
        (x ?? 0) * drawcharwidth + width * drawcharwidth * 0.5,
        (y ?? 0) * drawcharheight + height * drawcharheight * 0.5,
        0,
      ]}
    >
      <meshBasicMaterial transparent opacity={debug ? 0.7 : 0} color={'red'} />
    </Plane>
  )
}
