import { vminspect } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { layersreadcontrol } from 'zss/gadget/data/types'
import {
  useGadgetClient,
  useInspector,
  useTape,
} from 'zss/gadget/data/zustandstores'
import { useDeviceData } from 'zss/gadget/device'
import { indextopt, pttoindex } from 'zss/mapping/2d'
import { clamp } from 'zss/mapping/number'
import { isnumber } from 'zss/mapping/types'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'
import type { PT } from 'zss/words/types'

export function inspectboardsize(): { pickw: number; pickh: number } {
  const layers = useGadgetClient.getState().gadget.layers
  const control = layersreadcontrol(layers ?? [])
  return {
    pickw: control.width > 0 ? control.width : BOARD_WIDTH,
    pickh: control.height > 0 ? control.height : BOARD_HEIGHT,
  }
}

/** Dock touch + inspector on + parked selection waiting for confirm. */
export function inspectorselectionparked(): boolean {
  if (!useDeviceData.getState().showtouchcontrols) {
    return false
  }
  if (!useTape.getState().inspector) {
    return false
  }
  const { parked, cursor } = useInspector.getState()
  return parked === true && isnumber(cursor)
}

export function readinspectorbounds(pickw: number): {
  start: PT
  end: PT
} {
  const { cursor, select } = useInspector.getState()
  const cursorpt = indextopt(cursor ?? 0, pickw)
  const selectpt = indextopt(select ?? cursor ?? 0, pickw)
  return {
    start: {
      x: Math.min(cursorpt.x, selectpt.x),
      y: Math.min(cursorpt.y, selectpt.y),
    },
    end: {
      x: Math.max(cursorpt.x, selectpt.x),
      y: Math.max(cursorpt.y, selectpt.y),
    },
  }
}

export function ptininspectrect(x: number, y: number, pickw: number): boolean {
  const { start, end } = readinspectorbounds(pickw)
  return x >= start.x && x <= end.x && y >= start.y && y <= end.y
}

export function clearinspectorselection() {
  useInspector.setState({
    cursor: undefined,
    select: undefined,
    parked: false,
  })
}

/**
 * Dock drag ended: normalize corners so cursor=min and select=max, mark parked.
 */
export function parkinspectorselection() {
  const { cursor } = useInspector.getState()
  if (!isnumber(cursor)) {
    return
  }
  const { pickw } = inspectboardsize()
  const { start, end } = readinspectorbounds(pickw)
  useInspector.setState({
    cursor: pttoindex(start, pickw),
    select: pttoindex(end, pickw),
    parked: true,
  })
}

export function commitinspectorinspect(player: string) {
  const { cursor } = useInspector.getState()
  if (!isnumber(cursor)) {
    return
  }
  const { pickw } = inspectboardsize()
  const { start, end } = readinspectorbounds(pickw)
  vminspect(SOFTWARE, player, start, end)
  clearinspectorselection()
}

/**
 * Nudge a visual corner of the parked AABB.
 * `start` = top-left (min); `end` = bottom-right (max). Stores stay normalized.
 */
export function nudgeinspectorbound(
  which: 'start' | 'end',
  dx: number,
  dy: number,
) {
  const { cursor } = useInspector.getState()
  if (!isnumber(cursor)) {
    return
  }
  const { pickw, pickh } = inspectboardsize()
  const bounds = readinspectorbounds(pickw)
  let start = bounds.start
  let end = bounds.end
  if (which === 'start') {
    start = {
      x: clamp(start.x + dx, 0, pickw - 1),
      y: clamp(start.y + dy, 0, pickh - 1),
    }
  } else {
    end = {
      x: clamp(end.x + dx, 0, pickw - 1),
      y: clamp(end.y + dy, 0, pickh - 1),
    }
  }
  // Re-normalize so cursor is always min and select is always max.
  const nextstart = {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
  }
  const nextend = {
    x: Math.max(start.x, end.x),
    y: Math.max(start.y, end.y),
  }
  useInspector.setState({
    cursor: pttoindex(nextstart, pickw),
    select: pttoindex(nextend, pickw),
    parked: true,
  })
}
