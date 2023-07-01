import { Plane } from '@react-three/drei'

import { useClipping } from '../../clipping'
import { TILE_SIZE } from '../../img/types'

type ClickableProps = {
  width: number
  height: number
  cursor?: 'pointer' | 'text'
  onClick?: () => void
}

function noop() {
  //
}

export function Clickable({
  width,
  height,
  cursor = 'pointer',
  onClick = () => {
    //
  },
}: ClickableProps) {
  const clippingPlanes = useClipping()
  const twidth = width * TILE_SIZE
  const theight = height * TILE_SIZE
  return (
    <Plane
      args={[twidth, theight]}
      userData={{ cursor, clippingPlanes, blocking: true }}
      onClick={onClick}
      onPointerMove={noop}
      position={[twidth * 0.5, theight * 0.5, 0]}
    >
      <meshBasicMaterial visible={false} clippingPlanes={clippingPlanes} />
    </Plane>
  )
}

/*
    onClick?: (event: ThreeEvent<MouseEvent>) => void;
    onContextMenu?: (event: ThreeEvent<MouseEvent>) => void;
    onDoubleClick?: (event: ThreeEvent<MouseEvent>) => void;
    onPointerUp?: (event: ThreeEvent<PointerEvent>) => void;
    onPointerDown?: (event: ThreeEvent<PointerEvent>) => void;
    onPointerOver?: (event: ThreeEvent<PointerEvent>) => void;
    onPointerOut?: (event: ThreeEvent<PointerEvent>) => void;
    onPointerEnter?: (event: ThreeEvent<PointerEvent>) => void;
    onPointerLeave?: (event: ThreeEvent<PointerEvent>) => void;
    onPointerMove?: (event: ThreeEvent<PointerEvent>) => void;
    onPointerMissed?: (event: MouseEvent) => void;
    onPointerCancel?: (event: ThreeEvent<PointerEvent>) => void;
    onWheel?: (event: ThreeEvent<WheelEvent>) => void;
*/
