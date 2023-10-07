import React, { useEffect, useMemo, useRef } from 'react'
import { BufferGeometry } from 'three'

import {
  CHARSET_BITMAP,
  CHAR_HEIGHT,
  CHAR_WIDTH,
  PALETTE_BITMAP,
} from '../data'
import { convertPaletteToColors } from '../data/palette'
import useBitmapTexture from '../display/textures'
import {
  createTilemapBufferGeometry,
  createTilemapDataTexture,
  createTilemapMaterial,
} from '../display/tiles'

import { useClipping } from './clipping'

interface TilesProps {
  width: number
  height: number
  char: number[]
  color: number[]
  bg: number[]
  charset: CHARSET_BITMAP
  palette: PALETTE_BITMAP
}

export function Tiles({
  width,
  height,
  char,
  color,
  bg,
  charset,
  palette,
}: TilesProps) {
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
      char,
      color,
      bg,
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

  return (
    <mesh material={material}>
      <bufferGeometry ref={bgRef} />
    </mesh>
  )
}
