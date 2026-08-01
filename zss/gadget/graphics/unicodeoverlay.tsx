import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  DynamicDrawUsage,
  InstancedBufferAttribute,
  InstancedMesh,
} from 'three'
import type { Color } from 'three'
import { RUNTIME } from 'zss/config'
import { celltorendervalue } from 'zss/gadget/display/cellvalue'
import { lookupglyphasync } from 'zss/gadget/display/unicodeatlas'
import {
  createunicodeoverlaymaterial,
  getunicodeoverlayquadgeometry,
} from 'zss/gadget/display/unicodeoverlay'
import { type TILES_MEDIA_SOURCE, useGadgetMedia } from 'zss/gadget/gadgetmedia'
import { useMedia } from 'zss/gadget/media'
import { noraycastmesh } from 'zss/gadget/noraycastmesh'
import { indextox, indextoy } from 'zss/mapping/2d'
import { recordunicodescan } from 'zss/perf/renderupdatestats'

type UnicodeOverlayProps = {
  width: number
  height: number
  char: (string | number)[]
  color: number[]
  bg: number[]
  /** Scale factor for glyph size (default 1). Only affects overlay chars, not grid position. */
  scale?: number
  /**
   * Bumped when tile arrays are mutated in place (same as Tiles `tilesversion`).
   * Without this, cells useMemo keeps a stale empty list until remount/resize.
   */
  tilesversion?: number
  skipraycast?: boolean
  mediasource?: TILES_MEDIA_SOURCE
}

export function UnicodeOverlay({
  width,
  height,
  char,
  color,
  bg,
  scale = 1,
  tilesversion = 0,
  skipraycast = false,
  mediasource = 'board',
}: UnicodeOverlayProps) {
  const boardpalette = useMedia((state) => state.palettedata)
  const uipalette = useGadgetMedia((state) => state.palettedata)
  const resolvedpalette = mediasource === 'ui' ? uipalette : boardpalette
  const basew = RUNTIME.DRAW_CHAR_WIDTH()
  const baseh = RUNTIME.DRAW_CHAR_HEIGHT()
  const cellw = basew * scale
  const cellh = baseh * scale
  /** Square size so CJK/emoji keep correct aspect; 1.1 fills more of the 8x14 cell. */
  const cellsize = Math.min(cellw, cellh) * 1.1

  // Material on first paint (useState, not ref-after-layout) so InstancedMesh
  // is never mounted without a material — that made glyphs invisible until resize.
  const [material] = useState(() =>
    createunicodeoverlaymaterial([] as Color[]),
  )

  // instanced mesh data
  const [meshref, setmeshref] = useState<InstancedMesh | null>(null)
  const [offsetattr, setoffsetattr] = useState<InstancedBufferAttribute | null>(
    null,
  )
  const [uvattr, setuvattr] = useState<InstancedBufferAttribute | null>(null)
  const [colorattr, setcolorattr] = useState<InstancedBufferAttribute | null>(
    null,
  )
  const [bgindexattr, setbgindexattr] =
    useState<InstancedBufferAttribute | null>(null)

  // cell data
  const maxcells = width * height
  const offsetarray = useMemo(() => new Float32Array(maxcells * 2), [maxcells])
  const uvarray = useMemo(() => new Float32Array(maxcells * 2), [maxcells])
  const colorarray = useMemo(() => new Float32Array(maxcells), [maxcells])
  const bgindexarray = useMemo(() => new Float32Array(maxcells), [maxcells])

  const cells = useMemo(() => {
    const list: {
      index: number
      codepoint: number
      colori: number
      bgi: number
    }[] = []
    for (let i = 0; i < char.length; i++) {
      const codepoint = celltorendervalue(char[i] ?? 0)
      if (codepoint > 255) {
        list.push({
          index: i,
          codepoint,
          colori: (color[i] ?? 0) % 16,
          bgi: bg[i] ?? 16,
        })
      }
    }
    recordunicodescan(char.length, list.length)
    return list
    // tilesversion: char/color/bg are often mutated in place; identity alone is stale
  }, [char, color, bg, tilesversion])

  const { position, uv } = useMemo(() => getunicodeoverlayquadgeometry(), [])

  useLayoutEffect(() => {
    if (resolvedpalette) {
      material.uniforms.palette.value = resolvedpalette
    }
    material.uniforms.cellsize.value.set(cellsize, cellsize)
  }, [material, resolvedpalette, cellsize])

  const runidref = useRef(0)

  useEffect(() => {
    if (
      width === 0 ||
      height === 0 ||
      !meshref ||
      !offsetattr ||
      !uvattr ||
      !colorattr ||
      !bgindexattr
    ) {
      return
    }
    const runid = ++runidref.current
    type SlotResult = Awaited<ReturnType<typeof lookupglyphasync>>
    const apply = (slots: SlotResult[]) => {
      if (runid !== runidref.current) {
        return
      }
      let n = 0
      const halfpadx = (basew - cellsize) * 0.5
      const halfpady = (baseh - cellsize) * 0.5
      for (let i = 0; i < cells.length; i++) {
        const slot = slots[i]
        if (!slot) {
          continue
        }
        const cell = cells[i]
        const cx = indextox(cell.index, width)
        const cy = indextoy(cell.index, width)
        offsetarray[n * 2] = cx * basew + halfpadx
        offsetarray[n * 2 + 1] = cy * baseh + halfpady
        uvarray[n * 2] = slot.slotx
        uvarray[n * 2 + 1] = slot.sloty
        colorarray[n] = cell.colori
        bgindexarray[n] = cell.bgi
        n++
      }
      meshref.count = n
      offsetattr.needsUpdate = true
      uvattr.needsUpdate = true
      colorattr.needsUpdate = true
      bgindexattr.needsUpdate = true
    }
    void Promise.all(cells.map((c) => lookupglyphasync(c.codepoint))).then(
      apply,
    )
  }, [
    cells,
    width,
    height,
    scale,
    basew,
    baseh,
    cellsize,
    meshref,
    offsetattr,
    uvattr,
    colorattr,
    bgindexattr,
    offsetarray,
    uvarray,
    colorarray,
    bgindexarray,
  ])

  if (cells.length === 0) {
    return null
  }

  return (
    <instancedMesh
      ref={setmeshref}
      args={[undefined, undefined, maxcells]}
      raycast={skipraycast ? noraycastmesh : undefined}
    >
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[position, 3]} />
        <bufferAttribute attach="attributes-uv" args={[uv, 2]} />
        <instancedBufferAttribute
          ref={setoffsetattr}
          attach="attributes-offset"
          args={[offsetarray, 2]}
          usage={DynamicDrawUsage}
        />
        <instancedBufferAttribute
          ref={setuvattr}
          attach="attributes-uvOffset"
          args={[uvarray, 2]}
          usage={DynamicDrawUsage}
        />
        <instancedBufferAttribute
          ref={setcolorattr}
          attach="attributes-colorIndex"
          args={[colorarray, 1]}
          usage={DynamicDrawUsage}
        />
        <instancedBufferAttribute
          ref={setbgindexattr}
          attach="attributes-bgIndex"
          args={[bgindexarray, 1]}
          usage={DynamicDrawUsage}
        />
      </bufferGeometry>
      <primitive object={material} attach="material" />
    </instancedMesh>
  )
}
