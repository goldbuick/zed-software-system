import { useEffect, useRef, useState } from 'react'
import { BufferGeometry } from 'three'
import { CHAR_HEIGHT, CHAR_WIDTH } from 'zss/gadget/data/types'
import {
  createTilemapBufferGeometry,
  createTilemapDataTexture,
  createTilemapMaterial,
  updateTilemapDataTexture,
} from 'zss/gadget/display/tiles'

import { useMedia } from '../hooks'

type TilesProps = {
  width: number
  height: number
  char: number[]
  color: number[]
  bg: number[]
  fliptexture?: boolean
}

export function Tiles({
  width,
  height,
  char,
  color,
  bg,
  fliptexture = true,
}: TilesProps) {
  const palette = useMedia((state) => state.palettedata)
  const charset = useMedia((state) => state.charsetdata)
  const altcharset = useMedia((state) => state.altcharsetdata)

  const [material] = useState(() => createTilemapMaterial())
  const bgRef = useRef<BufferGeometry>(null)
  const { width: imageWidth = 0, height: imageHeight = 0 } =
    charset?.image ?? {}

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
    if (width === 0 || height === 0 || !bgRef.current || !charset) {
      return
    }
    createTilemapBufferGeometry(bgRef.current, width, height)
    material.uniforms.map.value = charset
    material.uniforms.alt.value = altcharset ?? charset
    material.uniforms.palette.value = palette
    material.uniforms.size.value.x = 1 / width
    material.uniforms.size.value.y = 1 / height
    material.uniforms.step.value.x = 1 / Math.round(imageWidth / CHAR_WIDTH)
    material.uniforms.step.value.y = 1 / Math.round(imageHeight / CHAR_HEIGHT)
    material.uniforms.flip.value = fliptexture
    material.needsUpdate = true
  }, [
    palette,
    charset,
    altcharset,
    material,
    width,
    height,
    imageWidth,
    imageHeight,
    fliptexture,
  ])

  return (
    <mesh material={material}>
      <bufferGeometry ref={bgRef} />
    </mesh>
  )
}
