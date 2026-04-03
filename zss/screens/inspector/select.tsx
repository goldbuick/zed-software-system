import { ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { Vector3 } from 'three'
import { RUNTIME } from 'zss/config'
import { vminspect } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { useGadgetClient, useInspector, useTape } from 'zss/gadget/data/state'
import { layersreadcontrol } from 'zss/gadget/data/types'
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

/** In dev: show pick sheet + selection quads (colors/wireframe) to verify pointer vs highlight grid. */
const selectionmeshdebug =
  typeof import.meta !== 'undefined' && import.meta.env?.DEV === true

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

  return (
    <>
      {inspector && (
        <mesh
          position={[0, 0, -1]}
          geometry={pickgeo}
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
            const pt = coordstileorigin(pickw, pickh)
            useInspector.setState(() => ({
              cursor: pttoindex(pt, pickw),
            }))
          }}
          onPointerMove={(e: ThreeEvent<PointerEvent>) => {
            if (ispresent(useInspector.getState().cursor)) {
              const hit = inspectorhit(e)
              if (!hit) {
                return
              }
              hit.object.worldToLocal(point.copy(hit.point))
              const pt = coordstileorigin(pickw, pickh)
              useInspector.setState(() => ({
                select: pttoindex(pt, pickw),
              }))
            }
          }}
          onPointerUp={completeselection}
          onPointerOut={completeselection}
          onPointerCancel={completeselection}
        >
          <meshBasicMaterial
            transparent
            opacity={selectionmeshdebug ? 0.12 : 0}
            depthWrite={false}
            visible
            color={selectionmeshdebug ? '#ffcc00' : 'black'}
            wireframe={selectionmeshdebug}
          />
        </mesh>
      )}
      {ispresent(cursor) && (
        <>
          <mesh
            raycast={noraycastmesh}
            position={[
              (rectorigin.x + 0.25) * cw,
              (rectorigin.y + 0.25) * ch,
              100,
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
            position={[rectorigin.x * cw, rectorigin.y * ch, 101]}
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
