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
  /**
   * Change-counter driving the data-upload effect when `char/color/bg` are
   * stable-identity arrays (e.g. mutated in place by `TilesRender`). Omit for
   * consumers whose arrays change identity on every update (e.g. `FlatLayer`).
   */
  version?: number
}

function scanhasunicode(char: (string | number)[]): boolean {
  for (let i = 0; i < char.length; i++) {
    const v = char[i]
    if (typeof v === 'number') {
      if (v > 255) {
        return true
      }
    } else if ((v?.codePointAt?.(0) ?? 0) > 255) {
      return true
    }
  }
  return false
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
  version,
}: TilesProps) {
  const mediapalette = useMedia((state) => state.palettedata)
  const mediacharset = useMedia((state) => state.charsetdata)
  const palette = mediapalette ?? defaultpalette
  const charset = mediacharset ?? defaultcharset

  const [material] = useState(() => createTilemapMaterial())
  const { width: imageWidth = 0, height: imageHeight = 0 } =
    charset?.image ?? {}

  // create data texture (size-scoped)
  useEffect(() => {
    if (width === 0 || height === 0) {
      return
    }
    material.uniforms.data.value = createTilemapDataTexture(width, height)
  }, [material.uniforms.data, width, height])

  // upload grid data and static uniforms in one pass; fires on any visible change
  // (size/char/color/bg identity or `version` bump, palette/charset/flip update)
  useEffect(() => {
    if (width === 0 || height === 0 || !charset) {
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
    material.uniforms.map.value = charset
    material.uniforms.palette.value = palette
    material.uniforms.size.value.x = 1 / width
    material.uniforms.size.value.y = 1 / height
    material.uniforms.step.value.x = 1 / Math.round(imageWidth / CHAR_WIDTH)
    material.uniforms.step.value.y = 1 / Math.round(imageHeight / CHAR_HEIGHT)
    material.uniforms.flip.value = fliptexture
    material.needsUpdate = true
  }, [
    material,
    palette,
    charset,
    width,
    height,
    char,
    color,
    bg,
    version,
    imageWidth,
    imageHeight,
    fliptexture,
    label,
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

  // pre-scan for unicode code points; skip the UnicodeOverlay subtree entirely
  // when the grid is pure ASCII (avoids InstancedMesh alloc + SDF lookups)
  const hasunicode = useMemo(
    () => scanhasunicode(char),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [char, version],
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
      {hasunicode && (
        <UnicodeOverlay
          width={width}
          height={height}
          char={char}
          color={color}
          bg={bg}
          version={version}
          skipraycast={skipraycast}
        />
      )}
    </>
  )
}
