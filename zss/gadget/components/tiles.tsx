import { useEffect, useMemo, useRef } from 'react'
import { BufferGeometry } from 'three'

import { BITMAP } from '../data/bitmap'
import { convertPaletteToColors } from '../data/palette'
import { CHAR_HEIGHT, CHAR_WIDTH } from '../data/types'
import useBitmapTexture from '../display/textures'
import {
  createTilemapBufferGeometry,
  createTilemapDataTexture,
  createTilemapMaterial,
  updateTilemapDataTexture,
} from '../display/tiles'

import { useClipping } from './clipping'

type TilesProps = {
  width: number
  height: number
  char: number[]
  color: number[]
  bg: number[]
  charset: BITMAP
  palette: BITMAP
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
  const charsetTexture = useBitmapTexture(charset)
  const clippingPlanes = useClipping()
  const bgRef = useRef<BufferGeometry>(null)
  const material = useMemo(() => createTilemapMaterial(), [])
  const { width: imageWidth = 0, height: imageHeight = 0 } =
    charsetTexture?.image ?? {}

  // create data texture
  useEffect(() => {
    material.uniforms.data.value = createTilemapDataTexture(width, height)
  }, [material.uniforms.data, width, height])

  // set data texture
  useEffect(() => {
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
    if (!charsetTexture || !bgRef.current) {
      return
    }
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
    palette,
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
