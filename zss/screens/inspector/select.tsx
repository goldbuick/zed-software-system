import { ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useState } from 'react'
import { DoubleSide, FrontSide, SphereGeometry, Vector3 } from 'three'
import { RAYCAST_DEBUG_DOT, RAYCAST_DEBUG_PICKSHEET, RUNTIME } from 'zss/config'
import { vminspect } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/registerplayer'
import { SOFTWARE } from 'zss/device/session'
import { layersreadcontrol } from 'zss/gadget/data/types'
import {
  useGadgetClient,
  useInspector,
  useTape,
} from 'zss/gadget/data/zustandstores'
import { StaticDither } from 'zss/gadget/graphics/dither'
import { Tiles } from 'zss/gadget/graphics/tiles'
import { noraycastmesh } from 'zss/gadget/noraycastmesh'
import { indextopt, pttoindex } from 'zss/mapping/2d'
import { clamp } from 'zss/mapping/number'
import { isnumber, ispresent } from 'zss/mapping/types'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'
import { COLOR } from 'zss/words/types'
import { useShallow } from 'zustand/react/shallow'

import {
  createboardpickgeometry,
  createpixelquadgeometry,
} from './boardpickgeometry'

const point = new Vector3()

/** Wireframe pick sheet + selection quad colors when `ZSS_DEBUG_RAYCAST_PICKSHEET` is on. */
const selectionmeshdebug = RAYCAST_DEBUG_PICKSHEET

const HOVER_CURSOR_CHAR = 197
const SELECTION_DITHER_OUTER_ALPHA = 0.25
const SELECTION_DITHER_INNER_ALPHA = 0.3

const BORDER_TL = 218
const BORDER_TR = 191
const BORDER_BL = 192
const BORDER_BR = 217
const BORDER_HZ = 196
const BORDER_VT = 179
const BORDER_SINGLE = 254

type SELECTION_BORDER = {
  char: number[]
  color: number[]
  bg: number[]
}

/** CP437 box frame for selection area; interior chars are 0 (discarded with ONCLEAR). */
function buildselectionborder(width: number, height: number): SELECTION_BORDER {
  const size = width * height
  const char = new Array<number>(size).fill(0)
  const color = new Array<number>(size).fill(COLOR.BLGREEN)
  const bg = new Array<number>(size).fill(COLOR.ONCLEAR)

  function setcell(x: number, y: number, code: number) {
    char[x + y * width] = code
  }

  if (width < 1 || height < 1) {
    return { char, color, bg }
  }

  if (width === 1 && height === 1) {
    setcell(0, 0, BORDER_SINGLE)
    return { char, color, bg }
  }

  if (width === 1) {
    setcell(0, 0, BORDER_VT)
    setcell(0, height - 1, BORDER_VT)
    for (let y = 1; y < height - 1; ++y) {
      setcell(0, y, BORDER_VT)
    }
    return { char, color, bg }
  }

  if (height === 1) {
    setcell(0, 0, BORDER_HZ)
    setcell(width - 1, 0, BORDER_HZ)
    for (let x = 1; x < width - 1; ++x) {
      setcell(x, 0, BORDER_HZ)
    }
    return { char, color, bg }
  }

  setcell(0, 0, BORDER_TL)
  setcell(width - 1, 0, BORDER_TR)
  setcell(0, height - 1, BORDER_BL)
  setcell(width - 1, height - 1, BORDER_BR)
  for (let x = 1; x < width - 1; ++x) {
    setcell(x, 0, BORDER_HZ)
    setcell(x, height - 1, BORDER_HZ)
  }
  for (let y = 1; y < height - 1; ++y) {
    setcell(0, y, BORDER_VT)
    setcell(width - 1, y, BORDER_VT)
  }
  return { char, color, bg }
}

/** Pick → VM tile indices (board local space; +Y down like tile geometry). */
function coordstileorigin(pickw: number, pickh: number) {
  const cw = RUNTIME.DRAW_CHAR_WIDTH()
  const ch = RUNTIME.DRAW_CHAR_HEIGHT()
  const px = Math.floor(point.x / cw)
  const py = Math.floor(point.y / ch)
  return {
    x: clamp(px, 0, pickw - 1),
    y: clamp(py, 0, pickh - 1),
  }
}

function inspectorhit(e: ThreeEvent<PointerEvent>) {
  if (e.intersections.length === 0) {
    return undefined
  }
  // Only the pick plane uses board-local coords for tile math; falling back to
  // `intersections[0]` can pick a tile mesh and corrupt local (x,y) vs the grid.
  return e.intersections.find((i) => i.object.userData?.inspectpick === true)
}

export function InspectorSelect() {
  const [debughit, setdebughit] = useState<{ x: number; y: number } | null>(
    null,
  )
  /** Tile under cursor (snapped) for hover glyph. */
  const [hovertile, sethovertile] = useState<{ x: number; y: number } | null>(
    null,
  )
  const inspector = useTape((state) => state.inspector)
  const gadgetlayers = useGadgetClient((s) => s.gadget.layers)
  const control = useMemo(
    () => layersreadcontrol(gadgetlayers ?? []),
    [gadgetlayers],
  )
  const pickw = control.width > 0 ? control.width : BOARD_WIDTH
  const pickh = control.height > 0 ? control.height : BOARD_HEIGHT
  const pickgeo = useMemo(
    () => createboardpickgeometry(pickw, pickh),
    [pickw, pickh],
  )
  useEffect(() => {
    return () => {
      pickgeo.dispose()
    }
  }, [pickgeo])

  const [cursor, select] = useInspector(
    useShallow((state) => [state.cursor, state.select]),
  )
  const cursorpt = indextopt(cursor ?? 0, pickw)
  const selectpt = indextopt(select ?? cursor ?? 0, pickw)

  const selectstart = {
    x: Math.min(cursorpt.x, selectpt.x),
    y: Math.min(cursorpt.y, selectpt.y),
  }
  const selectend = {
    x: Math.max(cursorpt.x, selectpt.x),
    y: Math.max(cursorpt.y, selectpt.y),
  }
  const selectwidth = selectend.x - selectstart.x + 1
  const selectheight = selectend.y - selectstart.y + 1
  const selectionborder = useMemo(
    () => buildselectionborder(selectwidth, selectheight),
    [selectwidth, selectheight],
  )

  // Highlight meshes align to the same tile grid as `coordstileorigin` (row r → y ∈ [r*ch,(r+1)*ch)).
  const rectorigin = selectstart

  const cw = RUNTIME.DRAW_CHAR_WIDTH()
  const ch = RUNTIME.DRAW_CHAR_HEIGHT()
  const debugdotradius = useMemo(() => Math.min(cw, ch) * 0.25, [cw, ch])
  const debugdotgeo = useMemo(
    () => new SphereGeometry(debugdotradius, 12, 12),
    [debugdotradius],
  )
  useEffect(() => {
    return () => {
      debugdotgeo.dispose()
    }
  }, [debugdotgeo])

  const selouterwpx = selectwidth * cw
  const selouterhpx = selectheight * ch
  const selinnerwpx = Math.max(0.001, selectwidth - 0.5) * cw
  const selinnerhpx = Math.max(0.001, selectheight - 0.5) * ch
  const seloutergeo = useMemo(() => {
    if (!selectionmeshdebug) {
      return undefined
    }
    return createpixelquadgeometry(selouterwpx, selouterhpx)
  }, [selouterwpx, selouterhpx])
  const selinnergeo = useMemo(() => {
    if (!selectionmeshdebug) {
      return undefined
    }
    return createpixelquadgeometry(selinnerwpx, selinnerhpx)
  }, [selinnerwpx, selinnerhpx])
  useEffect(() => {
    return () => {
      seloutergeo?.dispose()
      selinnergeo?.dispose()
    }
  }, [seloutergeo, selinnergeo])

  // track selection state
  function completeselection() {
    if (isnumber(useInspector.getState().cursor)) {
      vminspect(SOFTWARE, registerreadplayer(), selectstart, selectend)
    }
    useInspector.setState(() => ({
      cursor: undefined,
      select: undefined,
    }))
  }

  function pointerleave() {
    if (RAYCAST_DEBUG_DOT) {
      setdebughit(null)
    }
    sethovertile(null)
    completeselection()
  }

  return (
    <>
      {inspector && (
        <mesh
          position={[0, 0, 0]}
          geometry={pickgeo}
          renderOrder={selectionmeshdebug ? 50 : 0}
          userData={{
            inspectpick: true,
            blocking: false,
            cursor: 'pointer',
          }}
          onPointerDown={(e: ThreeEvent<PointerEvent>) => {
            const hit = inspectorhit(e)
            if (!hit) {
              return
            }
            hit.object.worldToLocal(point.copy(hit.point))
            if (RAYCAST_DEBUG_DOT) {
              setdebughit({ x: point.x, y: point.y })
            }
            const pt = coordstileorigin(pickw, pickh)
            sethovertile({ x: pt.x, y: pt.y })
            useInspector.setState(() => ({
              cursor: pttoindex(pt, pickw),
            }))
          }}
          onPointerMove={(e: ThreeEvent<PointerEvent>) => {
            const hit = inspectorhit(e)
            if (hit) {
              hit.object.worldToLocal(point.copy(hit.point))
              if (RAYCAST_DEBUG_DOT) {
                setdebughit({ x: point.x, y: point.y })
              }
              const pt = coordstileorigin(pickw, pickh)
              sethovertile({ x: pt.x, y: pt.y })
              if (ispresent(useInspector.getState().cursor)) {
                useInspector.setState(() => ({
                  select: pttoindex(pt, pickw),
                }))
              }
            } else {
              if (RAYCAST_DEBUG_DOT) {
                setdebughit(null)
              }
              sethovertile(null)
            }
          }}
          onPointerUp={completeselection}
          onPointerOut={pointerleave}
          onPointerCancel={pointerleave}
        >
          <meshBasicMaterial
            transparent
            /* Wireframe-only lines at ~0.12 opacity are nearly invisible; use higher alpha for edges. */
            opacity={selectionmeshdebug ? 0.55 : 0}
            depthWrite={false}
            depthTest={!selectionmeshdebug}
            side={selectionmeshdebug ? DoubleSide : FrontSide}
            polygonOffset={selectionmeshdebug}
            polygonOffsetFactor={-2}
            polygonOffsetUnits={-2}
            visible
            color={selectionmeshdebug ? '#ffcc00' : 'black'}
            wireframe={selectionmeshdebug}
          />
          {RAYCAST_DEBUG_DOT && debughit && (
            <mesh
              position={[debughit.x, debughit.y, 0.03]}
              geometry={debugdotgeo}
              raycast={noraycastmesh}
              renderOrder={51}
            >
              <meshBasicMaterial
                color="#ff00ff"
                depthWrite={false}
                depthTest={false}
              />
            </mesh>
          )}
        </mesh>
      )}
      {inspector && hovertile && (
        <group position={[hovertile.x * cw, hovertile.y * ch, 2]}>
          <Tiles
            width={1}
            height={1}
            char={[HOVER_CURSOR_CHAR]}
            color={[COLOR.BLGREEN]}
            bg={[COLOR.ONCLEAR]}
            skipraycast
            mediasource="ui"
          />
        </group>
      )}
      {ispresent(cursor) &&
        (selectionmeshdebug && selinnergeo && seloutergeo ? (
          <>
            <mesh
              raycast={noraycastmesh}
              position={[
                (rectorigin.x + 0.25) * cw,
                (rectorigin.y + 0.25) * ch,
                1,
              ]}
              geometry={selinnergeo}
            >
              <meshBasicMaterial
                color="#ff00aa"
                opacity={0.5}
                transparent
                depthWrite={false}
              />
            </mesh>
            <mesh
              raycast={noraycastmesh}
              position={[rectorigin.x * cw, rectorigin.y * ch, 2]}
              geometry={seloutergeo}
            >
              <meshBasicMaterial
                color="#00ffcc"
                opacity={0.45}
                transparent
                depthWrite={false}
                wireframe
              />
            </mesh>
          </>
        ) : (
          <>
            <group position={[rectorigin.x * cw, rectorigin.y * ch, 1]}>
              <StaticDither
                width={selectwidth}
                height={selectheight}
                alpha={SELECTION_DITHER_OUTER_ALPHA}
                color="white"
                raycast={noraycastmesh}
              />
            </group>
            <group
              position={[
                (rectorigin.x + 0.25) * cw,
                (rectorigin.y + 0.25) * ch,
                2,
              ]}
              scale={[
                (selectwidth - 0.5) / selectwidth,
                (selectheight - 0.5) / selectheight,
                1,
              ]}
            >
              <StaticDither
                width={selectwidth}
                height={selectheight}
                alpha={SELECTION_DITHER_INNER_ALPHA}
                color="black"
                raycast={noraycastmesh}
              />
            </group>
            <group position={[rectorigin.x * cw, rectorigin.y * ch, 3]}>
              <Tiles
                width={selectwidth}
                height={selectheight}
                char={selectionborder.char}
                color={selectionborder.color}
                bg={selectionborder.bg}
                skipraycast
                mediasource="ui"
              />
            </group>
          </>
        ))}
    </>
  )
}
