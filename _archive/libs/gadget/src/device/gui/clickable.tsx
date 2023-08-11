import { Plane } from '@react-three/drei'
import { useRef } from 'react'

import { useClipping } from '../../clipping'
import { TILE_SIZE } from '../../img/types'

type ClickableProps = {
  width: number
  height: number
  cursor?: 'pointer' | 'text'
  onClick?: () => void
  onPressed?: (pressed: boolean) => void
}

function noop() {
  //
}

export function Clickable({
  width,
  height,
  cursor = 'pointer',
  onClick = noop,
  onPressed = noop,
}: ClickableProps) {
  const clippingPlanes = useClipping()
  const twidth = width * TILE_SIZE
  const theight = height * TILE_SIZE
  const pressed = useRef(false)
  return (
    <Plane
      args={[twidth, theight]}
      userData={{ cursor, clippingPlanes, blocking: true }}
      onClick={noop}
      onPointerMove={noop}
      onPointerDown={() => {
        onPressed(true)
        pressed.current = true
      }}
      onPointerUp={() => {
        if (pressed.current) {
          onClick()
          onPressed(false)
          pressed.current = false
        }
      }}
      onPointerOut={() => {
        if (pressed.current) {
          onPressed(false)
          pressed.current = false
        }
      }}
      position={[twidth * 0.5, theight * 0.5, 0]}
    >
      <meshBasicMaterial visible={false} clippingPlanes={clippingPlanes} />
    </Plane>
  )
}
