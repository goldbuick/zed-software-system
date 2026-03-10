import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  DynamicDrawUsage,
  InstancedBufferAttribute,
  InstancedMesh,
} from 'three'
import { RUNTIME } from 'zss/config'
import { loadpalettefrombytes } from 'zss/feature/bytes'
import { PALETTE } from 'zss/feature/palette'
import { convertpalettetocolors } from 'zss/gadget/data/palette'
import { lookupglyph } from 'zss/gadget/display/unicodeatlas'
import {
  createunicodeoverlaymaterial,
  getunicodeoverlayquadgeometry,
} from 'zss/gadget/display/unicodeoverlay'
import { useMedia } from 'zss/gadget/media'

const defaultpalette = convertpalettetocolors(loadpalettefrombytes(PALETTE))

type UnicodeOverlayProps = {
  width: number
  height: number
  char: number[]
  color: number[]
  bg: number[]
}

export function UnicodeOverlay({
  width,
  height,
  char,
  color,
}: UnicodeOverlayProps) {
  const mediapalette = useMedia((state) => state.palettedata)
  const resolvedpalette = mediapalette ?? defaultpalette
  const cellw = RUNTIME.DRAW_CHAR_WIDTH()
  const cellh = RUNTIME.DRAW_CHAR_HEIGHT()

  // instanced mesh data
  const [meshref, setmeshref] = useState<InstancedMesh | null>(null)
  const [offsetattr, setoffsetattr] = useState<InstancedBufferAttribute | null>(
    null,
  )
  const [uvattr, setuvattr] = useState<InstancedBufferAttribute | null>(null)
  const [colorattr, setcolorattr] = useState<InstancedBufferAttribute | null>(
    null,
  )
  const materialref = useRef<ReturnType<
    typeof createunicodeoverlaymaterial
  > | null>(null)

  // cell data
  const maxcells = width * height
  const offsetarray = useMemo(() => new Float32Array(maxcells * 2), [maxcells])
  const uvarray = useMemo(() => new Float32Array(maxcells * 2), [maxcells])
  const colorarray = useMemo(() => new Float32Array(maxcells), [maxcells])

  const cells = useMemo(() => {
    const list: { index: number; codepoint: number; colori: number }[] = []
    for (let i = 0; i < char.length; i++) {
      const c = char[i] ?? 0
      if (c > 255) {
        list.push({
          index: i,
          codepoint: c,
          colori: (color[i] ?? 0) % 16,
        })
      }
    }
    return list
  }, [char, color])

  const { position, uv } = useMemo(() => getunicodeoverlayquadgeometry(), [])

  useLayoutEffect(() => {
    materialref.current ??= createunicodeoverlaymaterial(resolvedpalette)
    materialref.current.uniforms.palette.value = resolvedpalette
    materialref.current.uniforms.cellsize.value.set(cellw, cellh)
  }, [resolvedpalette, cellw, cellh])

  useEffect(() => {
    if (
      width === 0 ||
      height === 0 ||
      !meshref ||
      !offsetattr ||
      !uvattr ||
      !colorattr
    ) {
      return
    }
    let n = 0
    for (const cell of cells) {
      const slot = lookupglyph(cell.codepoint)
      if (!slot) {
        continue
      }
      const cx = cell.index % width
      const cy = Math.floor(cell.index / width)
      offsetarray[n * 2] = cx * cellw
      offsetarray[n * 2 + 1] = cy * cellh
      uvarray[n * 2] = slot.slotx
      uvarray[n * 2 + 1] = slot.sloty
      colorarray[n] = cell.colori
      n++
    }
    meshref.count = n
    offsetattr.needsUpdate = true
    uvattr.needsUpdate = true
    colorattr.needsUpdate = true
  }, [
    cells,
    width,
    height,
    cellw,
    cellh,
    meshref,
    offsetattr,
    uvattr,
    colorattr,
    offsetarray,
    uvarray,
    colorarray,
  ])

  if (cells.length === 0) {
    return null
  }

  return (
    <instancedMesh ref={setmeshref} args={[undefined, undefined, maxcells]}>
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
      </bufferGeometry>
      {materialref.current && (
        <primitive object={materialref.current} attach="material" />
      )}
    </instancedMesh>
  )
}
