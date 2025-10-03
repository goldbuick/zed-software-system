import { useEffect, useMemo, useState } from 'react'
import { loadcharsetfrombytes, loadpalettefrombytes } from 'zss/feature/bytes'
import { CHARSET } from 'zss/feature/charset'
import { PALETTE } from 'zss/feature/palette'
import { CHAR_HEIGHT, CHAR_WIDTH } from 'zss/gadget/data/types'
import {
  createTilemapBufferGeometryAttributes,
  createTilemapDataTexture,
  createTilemapMaterial,
  updateTilemapDataTexture,
} from 'zss/gadget/display/tiles'

import { convertpalettetocolors } from '../data/palette'
import { createbitmaptexture } from '../display/textures'
import { useMedia } from '../hooks'

const defaultpalette = convertpalettetocolors(loadpalettefrombytes(PALETTE))
const defaultcharset = createbitmaptexture(loadcharsetfrombytes(CHARSET))

type TilesProps = {
  width: number
  height: number
  char: number[]
  color: number[]
  bg: number[]
  fliptexture?: boolean
  alwaysdefaults?: boolean
}

export function Tiles({
  width,
  height,
  char,
  color,
  bg,
  fliptexture = true,
  alwaysdefaults = false,
}: TilesProps) {
  const mediapalette = useMedia((state) => state.palettedata)
  const mediacharset = useMedia((state) => state.charsetdata)
  const mediaaltcharset = useMedia((state) => state.altcharsetdata)
  const palette = alwaysdefaults ? defaultpalette : mediapalette
  const charset = alwaysdefaults ? defaultcharset : mediacharset
  const altcharset = alwaysdefaults ? defaultcharset : mediaaltcharset

  const [material] = useState(() => createTilemapMaterial())
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
    if (width === 0 || height === 0 || !charset) {
      return
    }
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

  // create buffer geo attributes
  const { position, uv } = useMemo(
    () => createTilemapBufferGeometryAttributes(width, height),
    [width, height],
  )

  return (
    <mesh>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[position, 3]} />
        <bufferAttribute attach="attributes-uv" args={[uv, 2]} />
      </bufferGeometry>
      <primitive object={material} attach="material" />
    </mesh>
  )
}
