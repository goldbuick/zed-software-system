import React, { useEffect, useMemo, useRef } from 'react'
import { BufferGeometry } from 'three'

import { range } from '/zss/mapping/array'

import { CHAR_HEIGHT, CHAR_WIDTH } from '../data'
import { convertPaletteToColors } from '../data/palette'
import useBitmapTexture from '../display/textures'
import {
  createTilemapBufferGeometry,
  createTilemapDataTexture,
  createTilemapMaterial,
} from '../display/tiles'
import { loadDefaultCharset, loadDefaultPalette } from '../file'

import { useClipping } from './clipping'

// start with hand typed data
const width = 16
const height = 16
const chars = range(width * height - 1).map((i) => i % 256)
const colors = range(width * height - 1).map((i) => 1 + (i % 15))
const bgs = range(width * height - 1).map(() => 0)
const charset = loadDefaultCharset()
const palette = loadDefaultPalette()

export function Tiles() {
  const charsetTexture = useBitmapTexture(charset?.bitmap)

  const clippingPlanes = useClipping()
  const bgRef = useRef<BufferGeometry>(null)
  const material = useMemo(() => createTilemapMaterial(), [])
  const { width: imageWidth = 0, height: imageHeight = 0 } =
    charsetTexture?.image ?? {}

  // create / config material
  useEffect(() => {
    if (!charsetTexture || !bgRef.current) {
      return
    }

    material.uniforms.data.value = createTilemapDataTexture(
      width,
      height,
      chars,
      colors,
      bgs,
    )

    createTilemapBufferGeometry(bgRef.current, width, height)

    const paletteColors = convertPaletteToColors(palette)

    material.uniforms.map.value = charsetTexture
    material.uniforms.alt.value = charsetTexture
    material.uniforms.palette.value = paletteColors
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

  console.info(material)

  return (
    <group position={[CHAR_WIDTH * 2, CHAR_HEIGHT * 2, 0]}>
      <mesh material={material}>
        <bufferGeometry ref={bgRef} />
      </mesh>
    </group>
  )
}
