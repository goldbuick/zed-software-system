import { Vector3 } from 'three'
import { RUNTIME } from 'zss/config'
import { vm_inspect } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { indextopt, pttoindex } from 'zss/mapping/2d'
import { ispresent } from 'zss/mapping/types'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'
import { useShallow } from 'zustand/react/shallow'

import { useTape, useTapeInspector } from '../data/state'
import { Rect } from '../rect'

const point = new Vector3()

function coords() {
  const cw = RUNTIME.DRAW_CHAR_WIDTH()
  const ch = RUNTIME.DRAW_CHAR_HEIGHT()
  const px = Math.floor(point.x / cw)
  const py = Math.floor((point.y + ch * 0.5) / ch)
  return {
    x: px,
    y: BOARD_HEIGHT * 0.5 + py,
  }
}

export function TapeTerminalInspector() {
  const inspector = useTape((state) => state.inspector)
  const [cursor, select] = useTapeInspector(
    useShallow((state) => [state.cursor, state.select]),
  )
  const cursorpt = indextopt(cursor ?? 0, BOARD_WIDTH)
  const selectpt = indextopt(select ?? cursor ?? 0, BOARD_WIDTH)

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

  // track selection state
  function completeselection() {
    if (useTapeInspector.getState().cursor) {
      vm_inspect(SOFTWARE, registerreadplayer(), selectstart, selectend)
    }
    useTapeInspector.setState(() => ({
      cursor: undefined,
      select: undefined,
    }))
  }

  return (
    <>
      {inspector ? (
        <Rect
          visible
          x={0}
          y={0}
          z={-1}
          width={BOARD_WIDTH}
          height={BOARD_HEIGHT}
          color="black"
          cursor="pointer"
          onPointerDown={(e) => {
            e.intersections[0].object.worldToLocal(
              point.copy(e.intersections[0].point),
            )
            const pt = coords()
            useTapeInspector.setState(() => ({
              cursor: pttoindex(pt, BOARD_WIDTH),
            }))
          }}
          onPointerMove={(e) => {
            if (ispresent(useTapeInspector.getState().cursor)) {
              e.intersections[0].object.worldToLocal(
                point.copy(e.intersections[0].point),
              )
              const pt = coords()
              useTapeInspector.setState(() => ({
                select: pttoindex(pt, BOARD_WIDTH),
              }))
            }
          }}
          onPointerUp={completeselection}
          onPointerOut={completeselection}
          onPointerCancel={completeselection}
        />
      ) : (
        <Rect
          visible
          x={0}
          y={0}
          z={-1}
          width={BOARD_WIDTH}
          height={BOARD_HEIGHT}
          color="black"
        />
      )}
      {ispresent(cursor) && (
        <>
          <Rect
            x={selectstart.x + 0.25}
            y={selectstart.y + 0.25}
            z={100}
            width={selectwidth - 0.5}
            height={selectheight - 0.5}
            color="black"
            opacity={0.3}
          />
          <Rect
            x={selectstart.x}
            y={selectstart.y}
            z={101}
            width={selectwidth}
            height={selectheight}
            color="white"
            opacity={0.25}
          />
        </>
      )}
    </>
  )
}
