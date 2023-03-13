import { MeshProps } from '@react-three/fiber'
import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { BufferGeometry } from 'three'

import {
  cloneMaterial,
  makeTiles,
  objectMaterial,
  terrainMaterial,
  TILE_SIZE,
  updateTiles,
} from '@/gadget/img/tiles'
import usePaddedTexture from '@/gadget/img/usePaddedTexture'
// import { GameBlock } from '@/gadget/types'

// import { useClipping } from '/cc/ui/Clipping'

// import usePlayState from './usePlayState'

interface Props extends Omit<MeshProps, 'clear'> {
  terrain?: boolean
  dimmed?: boolean
  dimmedAmount?: number
  transparent?: boolean
  tileSize?: number
  width?: number
  height?: number
  blocks?: (GameBlock | null)[]
}

export default React.forwardRef<MeshProps, Props>(function Blocks(
  {
    terrain = true,
    dimmed = false,
    dimmedAmount = 0.5,
    transparent = false,
    tileSize = TILE_SIZE,
    width = 1,
    height = 1,
    blocks = [],
    ...props
  }: Props,
  forwardedRef,
) {
  const playState = usePlayState((state) => ({
    texture: state.texture,
    altTexture: state.altTexture,
  }))

  const map = usePaddedTexture(playState.texture)
  const alt = usePaddedTexture(playState.altTexture)

  const { width: imageWidth = 0, height: imageHeight = 0 } = map?.image ?? {}

  const tiles = blocks.map((block) => block?.tile)
  const colors = blocks.map((block) => block?.color)

  const clippingPlanes = useClipping()
  const bgRef = useRef<BufferGeometry>(null)
  useLayoutEffect(() => {
    if (bgRef.current && map && imageWidth && imageHeight) {
      const positionCount = width * height * 4
      if (bgRef.current.attributes.position?.count === positionCount) {
        updateTiles(
          bgRef.current,
          tileSize,
          imageWidth,
          imageHeight,
          width,
          height,
          tiles,
          colors,
        )
      } else {
        makeTiles(
          bgRef.current,
          tileSize,
          imageWidth,
          imageHeight,
          width,
          height,
          tiles,
          colors,
        )
      }
    }
  }, [
    imageWidth,
    imageHeight,
    tileSize,
    width,
    height,
    tiles.join(),
    colors.join(),
  ])

  const material = useMemo(() => {
    return cloneMaterial(terrain ? terrainMaterial : objectMaterial)
  }, [terrain])

  useEffect(() => {
    const outline = 0.7
    if (map && alt) {
      material.transparent = dimmed || transparent
      material.uniforms.map.value = map
      material.uniforms.alt.value = alt
      material.uniforms.dimmed.value = dimmed ? dimmedAmount : 0
      material.uniforms.transparent.value = transparent
      material.uniforms.ox.value = (1 / imageWidth) * outline
      material.uniforms.oy.value = (1 / imageHeight) * outline
      material.clipping = clippingPlanes.length > 0
      material.clippingPlanes = clippingPlanes
      material.needsUpdate = true
    }
  }, [map, alt, dimmed, dimmedAmount, transparent, clippingPlanes])

  return (
    <mesh ref={forwardedRef} material={material} {...props}>
      <bufferGeometry ref={bgRef} />
    </mesh>
  )
})
