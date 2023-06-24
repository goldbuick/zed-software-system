import { Plane } from '@react-three/drei'

import { useClipping } from '../../clipping'
import { TILE_SIZE } from '../../img/types'

type ClickableProps = {
  width: number
  height: number
  cursor?: 'pointer' | 'text'
  blocking?: boolean
}

function noop() {
  //
}

export function Clickable({
  width,
  height,
  cursor = 'pointer',
  blocking = true,
}: ClickableProps) {
  const clippingPlanes = useClipping()
  const twidth = width * TILE_SIZE
  const theight = height * TILE_SIZE
  return (
    <Plane
      args={[twidth, theight]}
      userData={{ blocking, cursor, clippingPlanes }}
      onClick={blocking ? noop : undefined}
      onPointerMove={blocking ? noop : undefined}
      position={[twidth * 0.5, theight * 0.5, 0]}
    >
      <meshBasicMaterial visible={false} clippingPlanes={clippingPlanes} />
    </Plane>
  )
}
