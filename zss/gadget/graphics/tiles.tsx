import { useEffect, useMemo, useState } from 'react'
import type { Plane } from 'three'
import { RUNTIME } from 'zss/config'
import { CHAR_HEIGHT, CHAR_WIDTH } from 'zss/gadget/data/types'
import {
  createTilemapBufferGeometryAttributes,
  createTilemapDataTexture,
  createTilemapMaterial,
  updateTilemapDataTexture,
} from 'zss/gadget/display/tiles'
import { type TILES_MEDIA_SOURCE, useGadgetMedia } from 'zss/gadget/gadgetmedia'
import { useMedia } from 'zss/gadget/media'
import { noraycastmesh } from 'zss/gadget/noraycastmesh'

import { UnicodeOverlay } from './unicodeoverlay'

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
   * Optional content-change counter. When the tile arrays are mutated in
   * place (so identity doesn't change), bump this version to trigger the
   * data-texture upload effect without slicing/cloning the arrays.
   */
  tilesversion?: number
  /** board = useMedia (game); ui = useGadgetMedia (chrome). Default board. */
  mediasource?: TILES_MEDIA_SOURCE
  /** Partial upload cell indices when PERF_TILE_SUBIMAGE is enabled. */
  dirtycells?: Iterable<number>
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
  tilesversion = 0,
  mediasource = 'board',
  dirtycells,
}: TilesProps) {
  const boardpalette = useMedia((state) => state.palettedata)
  const boardcharset = useMedia((state) => state.charsetdata)
  const uipalette = useGadgetMedia((state) => state.palettedata)
  const uicharset = useGadgetMedia((state) => state.charsetdata)
  const palette = mediasource === 'ui' ? uipalette : boardpalette
  const charset = mediasource === 'ui' ? uicharset : boardcharset

  const [material] = useState(() => createTilemapMaterial())
  const { width: imageWidth = 0, height: imageHeight = 0 } =
    charset?.image ?? {}

  // create data texture
  useEffect(() => {
    if (width === 0 || height === 0) {
      return
    }
    const texture = createTilemapDataTexture(width, height)
    material.uniforms.data.value = texture
    return () => {
      texture.dispose()
    }
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
      dirtycells,
    )
  }, [
    material.uniforms.data.value,
    width,
    height,
    char,
    color,
    bg,
    label,
    tilesversion,
    dirtycells,
  ])

  // create / config material
  useEffect(() => {
    if (width === 0 || height === 0 || !charset || !palette) {
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

  // Bake DRAW_CHAR_* into verts; must rebuild when scale flips on resize.
  const drawscale = RUNTIME.DRAW_CHAR_SCALE

  // create buffer geo attributes
  const { position, uv } = useMemo(() => {
    // drawscale: createTilemapBufferGeometryAttributes reads RUNTIME.DRAW_CHAR_*
    void drawscale
    return createTilemapBufferGeometryAttributes(width, height)
  }, [width, height, drawscale])

  // key forces R3F to rebuild buffer attributes when cell dims / draw scale change;
  // swapping args alone can leave a stale GPU quad after resize.
  const geokey = `${width}x${height}@${drawscale}`

  return (
    <>
      <mesh raycast={skipraycast ? noraycastmesh : undefined}>
        <bufferGeometry key={geokey}>
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
        tilesversion={tilesversion}
        skipraycast={skipraycast}
        mediasource={mediasource}
      />
    </>
  )
}
