type RenderLayerProps = {
  viewwidth: number
  viewhight: number
}

export function RenderLayer({ viewwidth, viewheight }: RenderLayerProps) {
  return (
    <mesh position={[viewwidth, 0, 0]}>
      <planeGeometry args={[viewwidth, viewheight]} />
      <meshBasicMaterial>
        <RenderTexture
          attach="map"
          width={viewwidth}
          height={viewheight}
          depthBuffer={false}
          stencilBuffer={false}
          generateMipmaps={false}
        >
          <PerspectiveCamera
            makeDefault
            near={1}
            far={2000}
            position={[0, 0, 1000]}
          />
          <group position={[viewwidth * -0.5, viewheight * -0.5, 0]}>
            {layers.map((layer, i) => (
              <FlatLayer
                key={layer.id}
                id={layer.id}
                from="layers"
                z={1 + i * 2}
              />
            ))}
          </group>
        </RenderTexture>
      </meshBasicMaterial>
    </mesh>
  )
}
