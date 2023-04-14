import { MeshProps } from '@react-three/fiber'
import { forwardRef, useRef, useLayoutEffect, useMemo, useEffect } from 'react'
import { BufferGeometry, CanvasTexture, Mesh } from 'three'

import {
  flatMaterial,
  outlineMaterial,
  makeTiles,
  updateTiles,
  cloneMaterial,
} from '../img/tiles'

import { useClipping } from '../Clipping'
import { COLOR } from '../img/colors'

export type Char = {
  color?: COLOR
  code?: number
}

export type CharSetProps = {
  width?: number
  height?: number
  chars?: (Char | undefined | null)[]
  dimmed?: boolean // puts this at half opacity
  outline?: boolean // objects use outlined chars
  map: CanvasTexture
  alt: CanvasTexture
} & Omit<MeshProps, 'clear'>

// We should be able to apply "filters" to chars before they're passed
// to a CharSet
// We could do a Context / Hook to add/remove filters

export const CharSet = forwardRef<Mesh, CharSetProps>(function (
  {
    width = 1,
    height = 1,
    chars = [],
    dimmed = false,
    outline = false,
    map,
    alt,
    ...props
  }: CharSetProps,
  forwardedRef,
) {
  const clippingPlanes = useClipping()
  const bgRef = useRef<BufferGeometry>(null)
  const { width: imageWidth = 0, height: imageHeight = 0 } = map.image ?? {}

  useLayoutEffect(() => {
    const tiles = chars.map((block) => block?.code)
    const colors = chars.map((block) => block?.color)

    if (bgRef.current && map) {
      const { width: imageWidth, height: imageHeight } = map.image
      if (bgRef.current.attributes.position?.count === width * height * 4) {
        updateTiles(
          bgRef.current,
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
          imageWidth,
          imageHeight,
          width,
          height,
          tiles,
          colors,
        )
      }
    }
  }, [map, width, height, chars])

  const material = useMemo(() => {
    return cloneMaterial(outline ? outlineMaterial : flatMaterial)
  }, [outline])

  useEffect(() => {
    const strokeWidth = 0.7
    if (map && alt) {
      material.transparent = dimmed || outline
      material.uniforms.map.value = map
      material.uniforms.alt.value = alt
      material.uniforms.dimmed.value = dimmed
      material.uniforms.transparent.value = outline
      material.uniforms.ox.value = (1 / imageWidth) * strokeWidth
      material.uniforms.oy.value = (1 / imageHeight) * strokeWidth
      material.clipping = clippingPlanes.length > 0
      material.clippingPlanes = clippingPlanes
      material.needsUpdate = true
    }
  }, [
    map,
    alt,
    material,
    outline,
    dimmed,
    imageWidth,
    imageHeight,
    clippingPlanes,
  ])

  return (
    <mesh ref={forwardedRef} material={material} {...props}>
      <bufferGeometry ref={bgRef} />
    </mesh>
  )
})
