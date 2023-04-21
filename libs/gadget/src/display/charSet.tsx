import { MeshProps } from '@react-three/fiber'
import { forwardRef, useRef, useLayoutEffect, useMemo, useEffect } from 'react'
import { BufferGeometry, CanvasTexture, Mesh } from 'three'

import { useClipping } from '../clipping'
import {
  createTilemapBufferGeometry,
  createTilemapDataTexture,
  createTilemapMaterial,
  updateTilemapDataTexture,
} from '../img/tilemap'
import { CHARS } from '../types'

export type CharSetProps = {
  width?: number
  height?: number
  chars?: CHARS
  dimmed?: boolean // puts this at half opacity
  outline?: boolean // objects use outlined chars
  map: CanvasTexture
  alt: CanvasTexture
} & Omit<MeshProps, 'clear'>

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
  const material = useMemo(() => createTilemapMaterial(), [])
  // update data texture with current chars
  useLayoutEffect(() => {
    const codes = chars.map((block) => block?.code)
    const colors = chars.map((block) => block?.color)

    if (material.uniforms.data.value) {
      updateTilemapDataTexture(
        material.uniforms.data.value,
        width,
        height,
        codes,
        colors,
      )
    } else {
      material.uniforms.data.value = createTilemapDataTexture(
        width,
        height,
        codes,
        colors,
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, chars])

  const bgRef = useRef<BufferGeometry>(null)
  // update single quad to proper size
  useLayoutEffect(() => {
    if (
      !bgRef.current ||
      bgRef.current.attributes.position?.count === width * height * 4
    ) {
      return
    }

    createTilemapBufferGeometry(bgRef.current, width, height)
  }, [width, height])

  const clippingPlanes = useClipping()
  const { width: imageWidth = 0, height: imageHeight = 0 } = map.image ?? {}
  // config material
  useEffect(() => {
    const strokeWidth = 0.8
    if (map && alt) {
      material.transparent = dimmed || outline
      material.uniforms.map.value = map
      material.uniforms.alt.value = alt
      material.uniforms.dimmed.value = dimmed
      material.uniforms.transparent.value = outline
      material.uniforms.size.value.x = 1 / width
      material.uniforms.size.value.y = 1 / height
      material.uniforms.step.value.x = 1 / 16
      material.uniforms.step.value.y = 1 / 16
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
    dimmed,
    outline,
    width,
    height,
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
