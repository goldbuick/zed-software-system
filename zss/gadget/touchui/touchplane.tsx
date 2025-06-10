import { Plane } from '@react-three/drei'
import { EventHandlers } from '@react-three/fiber'
import { RUNTIME } from 'zss/config'

type ButtonProps = {
  x?: number
  y?: number
  z?: number
  width: number
  height: number
  debug?: boolean
} & EventHandlers

export function TouchPlane({
  x,
  y,
  z,
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
        z ?? 0,
      ]}
    >
      <meshBasicMaterial transparent opacity={debug ? 0.7 : 0} color={'red'} />
    </Plane>
  )
}

// onPointerDown={(e) => console.info('down', e)}
// onPointerMove={(e) => console.info('move', e)}
// onPointerUp={(e) => console.info('up', e)}
// onPointerCancel={(e) => console.info('cancel', e)}
// onPointerLeave={(e) => console.info('leave', e)}
// onPointerMissed={(e) => console.info('missed', e)}
