import { useEffect, useMemo, useState } from 'react'
import type { Plane } from 'three'
import { loadcharsetfrombytes, loadpalettefrombytes } from 'zss/feature/bytes'
import { CHARSET } from 'zss/feature/charset'
import { PALETTE } from 'zss/feature/palette'
import { convertpalettetocolors } from 'zss/gadget/data/palette'
import { palettetothreecolors } from 'zss/gadget/data/palettethree'
import { CHAR_HEIGHT, CHAR_WIDTH } from 'zss/gadget/data/types'
import { createbitmaptexture } from 'zss/gadget/display/textures'
import {
  createTilemapBufferGeometryAttributes,
  createTilemapDataTexture,
  createTilemapMaterial,
  updateTilemapDataTexture,
} from 'zss/gadget/display/tiles'
import { useMedia } from 'zss/gadget/media'
import { noraycastmesh } from 'zss/gadget/noraycastmesh'

import { UnicodeOverlay } from './unicodeoverlay'

const defaultpalette = palettetothreecolors(
  convertpalettetocolors(loadpalettefrombytes(PALETTE)),
)
const defaultcharset = createbitmaptexture(loadcharsetfrombytes(CHARSET))

type TilesProps = {
  label?: string
  width: number
  height: number
  char: (string | number)[]
  color: number[]
  bg: number[]
  fliptexture?: boolean
  clippingplanes?: Plane[]
  /** Omit from raycasting (e.g. inspector pts overlay above the pick plane). */
  skipraycast?: boolean
}

export function Tiles({
  label,
  width,
  height,
  char,
  color,
  bg,
  fliptexture = true,
  clippingplanes,
  skipraycast = false,
}: TilesProps) {
  const mediapalette = useMedia((state) => state.palettedata)
  const mediacharset = useMedia((state) => state.charsetdata)
  const palette = mediapalette ?? defaultpalette
  const charset = mediacharset ?? defaultcharset

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
  }, [material.uniforms.data.value, width, height, char, color, bg, label])

  // create / config material
  useEffect(() => {
    if (width === 0 || height === 0 || !charset) {
      return
    }
    material.uniforms.map.value = charset
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
    material,
    width,
    height,
    imageWidth,
    imageHeight,
    fliptexture,
  ])

  useEffect(() => {
    material.clippingPlanes = clippingplanes ?? []
    material.needsUpdate = true
  }, [material, clippingplanes])

  // create buffer geo attributes
  const { position, uv } = useMemo(
    () => createTilemapBufferGeometryAttributes(width, height),
    [width, height],
  )

  return (
    <>
      <mesh raycast={skipraycast ? noraycastmesh : undefined}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[position, 3]} />
          <bufferAttribute attach="attributes-uv" args={[uv, 2]} />
        </bufferGeometry>
        <primitive object={material} attach="material" />
      </mesh>
      <UnicodeOverlay
        width={width}
        height={height}
        char={char}
        color={color}
        bg={bg}
        scale={1.15}
        skipraycast={skipraycast}
      />
    </>
  )
}
