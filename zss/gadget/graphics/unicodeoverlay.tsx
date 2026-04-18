import { useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  DynamicDrawUsage,
  InstancedBufferAttribute,
  InstancedMesh,
} from 'three'
import { RUNTIME } from 'zss/config'
import { loadpalettefrombytes } from 'zss/feature/bytes'
import { PALETTE } from 'zss/feature/palette'
import { useDeviceData } from 'zss/gadget/device'
import { convertpalettetocolors } from 'zss/gadget/data/palette'
import { palettetothreecolors } from 'zss/gadget/data/palettethree'
import { celltorendervalue } from 'zss/gadget/display/cellvalue'
import {
  getunicodeatlas,
  lookupglyphasync,
  setunicodeatlasrasterhint,
} from 'zss/gadget/display/unicodeatlas'
import {
  createunicodeoverlaymaterial,
  getunicodeoverlayquadgeometry,
} from 'zss/gadget/display/unicodeoverlay'
import { useMedia } from 'zss/gadget/media'
import { noraycastmesh } from 'zss/gadget/noraycastmesh'

const defaultpalette = palettetothreecolors(
  convertpalettetocolors(loadpalettefrombytes(PALETTE)),
)

type UnicodeOverlayProps = {
  width: number
  height: number
  char: (string | number)[]
  color: number[]
  bg: number[]
  /** Scale factor for glyph size (default 1). Only affects overlay chars, not grid position. */
  scale?: number
  skipraycast?: boolean
  /** Subtle dark outline for low-contrast backgrounds (default false). */
  outline?: boolean
  /** Change-counter for stable-identity char/color/bg arrays (see `Tiles#version`). */
  version?: number
}

export function UnicodeOverlay({
  width,
  height,
  char,
  color,
  bg,
  scale = 1,
  skipraycast = false,
  outline = false,
  version,
}: UnicodeOverlayProps) {
  const mediapalette = useMedia((state) => state.palettedata)
  const resolvedpalette = mediapalette ?? defaultpalette
  const viewportdpr = useThree((s) => s.viewport.dpr)
  const gpudprscale = useDeviceData((s) => s.gpudprscale)
  const rasterproduct = viewportdpr * gpudprscale

  const basew = RUNTIME.DRAW_CHAR_WIDTH()
  const baseh = RUNTIME.DRAW_CHAR_HEIGHT()
  const cellw = basew * scale
  const cellh = baseh * scale
  /** Fraction of cell height where baseline sits (0..1 from top) for vertical alignment */
  const baseline_fraction = 0.8

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
  const materialref = useRef<ReturnType<
    typeof createunicodeoverlaymaterial
  > | null>(null)

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
    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [char, color, bg, version])

  const { position, uv } = useMemo(() => getunicodeoverlayquadgeometry(), [])

  useLayoutEffect(() => {
    setunicodeatlasrasterhint(rasterproduct)
    materialref.current ??= createunicodeoverlaymaterial(
      resolvedpalette,
      outline,
    )
    materialref.current.uniforms.atlas.value = getunicodeatlas()
    materialref.current.uniforms.palette.value = resolvedpalette
    materialref.current.uniforms.cellsize.value.set(cellw, cellh)
    materialref.current.uniforms.useoutline.value = outline ? 1 : 0
  }, [resolvedpalette, cellw, cellh, outline, rasterproduct])

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
      const cellbaseline_y = cellh * baseline_fraction
      for (let i = 0; i < cells.length; i++) {
        const slot = slots[i]
        if (!slot) {
          continue
        }
        const cell = cells[i]
        const cx = cell.index % width
        const cy = Math.floor(cell.index / width)
        offsetarray[n * 2] = cx * basew + (basew - cellw) * 0.5
        offsetarray[n * 2 + 1] =
          cy * baseh + cellbaseline_y - slot.baseline_from_top * cellh
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
    cellw,
    cellh,
    baseline_fraction,
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
      {materialref.current && (
        <primitive object={materialref.current} attach="material" />
      )}
    </instancedMesh>
  )
}
