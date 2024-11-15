import { useEffect, useRef, useState } from 'react'
import { BufferGeometry } from 'three'

import { CHAR_HEIGHT, CHAR_WIDTH } from '../data/types'
import useBitmapTexture from '../display/textures'
import {
  createTilemapBufferGeometry,
  createTilemapDataTexture,
  createTilemapMaterial,
  updateTilemapDataTexture,
} from '../display/tiles'
import { loadDefaultCharset } from '../file/bytes'

import { useClipping } from './clipping'

type TilesProps = {
  width: number
  height: number
  char: number[]
  color: number[]
  bg: number[]
}

const charset = loadDefaultCharset()

export function Tiles({ width, height, char, color, bg }: TilesProps) {
  const charsetTexture = useBitmapTexture(charset)
  const clippingPlanes = useClipping()
  const [material] = useState(() => createTilemapMaterial())
  const bgRef = useRef<BufferGeometry>(null)
  const { width: imageWidth = 0, height: imageHeight = 0 } =
    charsetTexture?.image ?? {}

  // create data texture
  useEffect(() => {
    if (width === 0 || height === 0) {
      return
    }
    material.uniforms.data.value = createTilemapDataTexture(width, height)
  }, [material.uniforms.data, width, height])

  // set data texture
  useEffect(() => {
    if (width === 0 || height === 0) {
      return
    }
    updateTilemapDataTexture(
      material.uniforms.data.value,
      width,
      height,
      char,
      color,
      bg,
    )
  }, [material.uniforms.data.value, width, height, char, color, bg])

  // create / config material
  useEffect(() => {
    if (width === 0 || height === 0 || !bgRef.current || !charsetTexture) {
      return
    }
    createTilemapBufferGeometry(bgRef.current, width, height)
    material.uniforms.size.value.x = 1 / width
    material.uniforms.size.value.y = 1 / height
    material.uniforms.step.value.x = 1 / Math.round(imageWidth / CHAR_WIDTH)
    material.uniforms.step.value.y = 1 / Math.round(imageHeight / CHAR_HEIGHT)
    material.clipping = clippingPlanes.length > 0
    material.clippingPlanes = clippingPlanes
    material.needsUpdate = true
  }, [
    charsetTexture,
    material,
    width,
    height,
    imageWidth,
    imageHeight,
    clippingPlanes,
  ])

  return (
    <mesh material={material}>
      <bufferGeometry ref={bgRef} />
    </mesh>
  )
}
