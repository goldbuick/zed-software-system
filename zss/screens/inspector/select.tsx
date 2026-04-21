import { ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useState } from 'react'
import {
  DoubleSide,
  EdgesGeometry,
  FrontSide,
  PlaneGeometry,
  SphereGeometry,
  Vector3,
} from 'three'
import { LineMaterial } from 'three/addons/lines/LineMaterial.js'
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js'
import { RAYCAST_DEBUG_DOT, RAYCAST_DEBUG_PICKSHEET, RUNTIME } from 'zss/config'
import { vminspect } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { layersreadcontrol } from 'zss/gadget/data/types'
import {
  useGadgetClient,
  useInspector,
  useTape,
} from 'zss/gadget/data/zustandstores'
import { noraycastmesh } from 'zss/gadget/noraycastmesh'
import { indextopt, pttoindex } from 'zss/mapping/2d'
import { clamp } from 'zss/mapping/number'
import { isnumber, ispresent } from 'zss/mapping/types'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'
import { useShallow } from 'zustand/react/shallow'

import {
  createboardpickgeometry,
  createpixelquadgeometry,
} from './boardpickgeometry'

const point = new Vector3()

/** Wireframe pick sheet + selection quad colors when `ZSS_DEBUG_RAYCAST_PICKSHEET` is on. */
const selectionmeshdebug = RAYCAST_DEBUG_PICKSHEET

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
  /** Tile under cursor (snapped), for debug tile rect outline — only when `ZSS_DEBUG_RAYCAST_DOT`. */
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
  const tileboxlinegeo = useMemo(() => {
    const plane = new PlaneGeometry(cw, ch)
    const edges = new EdgesGeometry(plane)
    plane.dispose()
    const geo = new LineSegmentsGeometry()
    geo.fromEdgesGeometry(edges)
    edges.dispose()
    return geo
  }, [cw, ch])
  useEffect(() => {
    return () => {
      tileboxlinegeo.dispose()
    }
  }, [tileboxlinegeo])
  const tileboxlinemat = useMemo(
    () =>
      new LineMaterial({
        color: '#00ffaa',
        linewidth: 5,
        opacity: 0.5,
        depthWrite: false,
        depthTest: false,
        transparent: true,
      }),
    [],
  )
  useEffect(() => {
    return () => {
      tileboxlinemat.dispose()
    }
  }, [tileboxlinemat])
  const tileboxline = useMemo(
    () => new LineSegments2(tileboxlinegeo, tileboxlinemat),
    [tileboxlinegeo, tileboxlinemat],
  )
  const selouterwpx = selectwidth * cw
  const selouterhpx = selectheight * ch
  const selinnerwpx = Math.max(0.001, selectwidth - 0.5) * cw
  const selinnerhpx = Math.max(0.001, selectheight - 0.5) * ch
  const seloutergeo = useMemo(
    () => createpixelquadgeometry(selouterwpx, selouterhpx),
    [selouterwpx, selouterhpx],
  )
  const selinnergeo = useMemo(
    () => createpixelquadgeometry(selinnerwpx, selinnerhpx),
    [selinnerwpx, selinnerhpx],
  )
  useEffect(() => {
    return () => {
      seloutergeo.dispose()
      selinnergeo.dispose()
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

  function pointerleavedebug() {
    if (RAYCAST_DEBUG_DOT) {
      setdebughit(null)
      sethovertile(null)
    }
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
            } else if (RAYCAST_DEBUG_DOT) {
              setdebughit(null)
              sethovertile(null)
            }
          }}
          onPointerUp={completeselection}
          onPointerOut={pointerleavedebug}
          onPointerCancel={pointerleavedebug}
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
          {hovertile && (
            <primitive
              object={tileboxline}
              position={[(hovertile.x + 0.5) * cw, (hovertile.y + 0.5) * ch, 2]}
              raycast={noraycastmesh}
              renderOrder={52}
            />
          )}
        </mesh>
      )}
      {ispresent(cursor) && (
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
              color={selectionmeshdebug ? '#ff00aa' : 'black'}
              opacity={selectionmeshdebug ? 0.5 : 0.3}
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
              color={selectionmeshdebug ? '#00ffcc' : 'white'}
              opacity={selectionmeshdebug ? 0.45 : 0.25}
              transparent
              depthWrite={false}
              wireframe={selectionmeshdebug}
            />
          </mesh>
        </>
      )}
    </>
  )
}
