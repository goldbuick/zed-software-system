import { RenderTexture } from '@react-three/drei'
import { ReactNode } from 'react'

type RenderLayerProps = {
  viewwidth: number
  viewheight: number
  children?: ReactNode
}

export function RenderLayer({
  viewwidth,
  viewheight,
  children,
}: RenderLayerProps) {
  return (
    <mesh position={[viewwidth * 0.5, viewheight * 0.5, 0]}>
      <planeGeometry args={[viewwidth, viewheight]} />
      <meshBasicMaterial transparent>
        <RenderTexture
          attach="map"
          width={viewwidth}
          height={viewheight}
          depthBuffer={false}
          stencilBuffer={false}
          generateMipmaps={false}
        >
          {children}
        </RenderTexture>
      </meshBasicMaterial>
    </mesh>
  )
}
