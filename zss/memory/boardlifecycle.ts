import {
  FORMAT_OBJECT,
  FORMAT_SKIP,
  formatobject,
  unformatobject,
} from 'zss/feature/format'
import { pttoindex } from 'zss/mapping/2d'
import { createsid } from 'zss/mapping/guid'
import { MAYBE, deepcopy, ispresent, noop } from 'zss/mapping/types'
import { PT } from 'zss/words/types'

import {
  memoryexportboardelement,
  memoryimportboardelement,
} from './boardelement'
import {
  memorydeleteboardobjectnamedlookup,
  memorydeleteboardterrainnamed,
} from './boardlookup'
import { memoryreadelementstat } from './boards'
import { memoryreadelementdisplay } from './bookoperations'
import { memorymarkboarddirty } from './memorydirty'
import {
  BOARD,
  BOARD_ELEMENT,
  BOARD_ELEMENT_STAT,
  BOARD_HEIGHT,
  BOARD_KEYS,
  BOARD_SIZE,
  BOARD_WIDTH,
} from './types'

function createempty() {
  return new Array(BOARD_WIDTH * BOARD_HEIGHT).map(() => undefined)
}

export function memorydeleteboardobject(board: MAYBE<BOARD>, id: string) {
  if (ispresent(board?.objects[id])) {
    delete board.objects[id]
    memorymarkboarddirty(board)
    return true
  }
  return false
}

export function memoryexportboard(board: MAYBE<BOARD>): MAYBE<FORMAT_OBJECT> {
  return formatobject(board, BOARD_KEYS, {
    terrain: (terrain) => terrain.map(memoryexportboardelement),
    objects: (objects) =>
      Object.values<BOARD_ELEMENT>(objects)
        .filter((boardelement) => !boardelement.removed)
        .map(memoryexportboardelement),
    id: FORMAT_SKIP,
    name: FORMAT_SKIP,
    named: FORMAT_SKIP,
    lookup: FORMAT_SKIP,
    codepage: FORMAT_SKIP,
    distmaps: FORMAT_SKIP,
    overboard: FORMAT_SKIP,
    underboard: FORMAT_SKIP,
    charsetpage: FORMAT_SKIP,
    palettepage: FORMAT_SKIP,
    drawlastfp: FORMAT_SKIP,
    drawlastxy: FORMAT_SKIP,
    drawallowids: FORMAT_SKIP,
    drawneedfull: FORMAT_SKIP,
  })
}

export function memoryimportboard(
  boardentry: MAYBE<FORMAT_OBJECT>,
): MAYBE<BOARD> {
  return unformatobject(boardentry, BOARD_KEYS, {
    terrain: (terrain) => terrain.map(memoryimportboardelement),
    objects: (elements) => {
      const objects: Record<string, BOARD_ELEMENT> = {}
      for (let i = 0; i < elements.length; ++i) {
        const obj = memoryimportboardelement(elements[i])
        if (ispresent(obj?.id)) {
          objects[obj.id] = obj
        }
      }
      return objects
    },
  })
}

export function memorycreateboardobject(
  board: MAYBE<BOARD>,
  from: MAYBE<BOARD_ELEMENT>,
): MAYBE<BOARD_ELEMENT> {
  if (!ispresent(board) || !ispresent(from)) {
    return undefined
  }
  const object = deepcopy(from)
  object.id = object.id ?? createsid()
  board.objects[object.id] = object
  memorymarkboarddirty(board)
  return board.objects[object.id]
}

export function memorycreateboardobjectfromkind(
  board: MAYBE<BOARD>,
  pt: PT,
  kind: string,
  id?: string,
): MAYBE<BOARD_ELEMENT> {
  return memorycreateboardobject(board, { ...pt, kind, id })
}

export function memoryreadgroup(
  board: MAYBE<BOARD>,
  self: string,
  targetgroup: string,
) {
  const objectelements: BOARD_ELEMENT[] = []
  const terrainelements: BOARD_ELEMENT[] = []
  if (!ispresent(board)) {
    return { objectelements, terrainelements }
  }

  function checkelement(el: BOARD_ELEMENT, isterrain: boolean) {
    if (el.removed) {
      return false
    }
    switch (targetgroup) {
      case 'all':
        return true
      case 'self':
        return el?.id === self
      case 'others':
        return el?.id !== self
      case 'terrain':
        return isterrain === true
      case 'object':
        return isterrain === false
    }
    const statnamed = memoryreadelementstat(
      el,
      targetgroup as BOARD_ELEMENT_STAT,
    )
    return (
      ispresent(statnamed) ||
      memoryreadelementdisplay(el).name === targetgroup ||
      memoryreadelementstat(el, 'group') === targetgroup
    )
  }

  // first pass collect terrain elements
  const terrainindexes = new Set<number>()
  for (let i = 0; i < BOARD_SIZE; ++i) {
    const maybeterrain: MAYBE<BOARD_ELEMENT> = board.terrain[i]
    if (ispresent(maybeterrain) && checkelement(maybeterrain, true)) {
      terrainelements.push(maybeterrain)
      terrainindexes.add(i)
    }
  }

  // second pass collect object elements
  const allobjects = Object.values(board.objects)
  for (let i = 0; i < allobjects.length; ++i) {
    const object = allobjects[i]
    if (checkelement(object, false)) {
      // object element is a match!
      objectelements.push(object)
    } else {
      // check if the object is on the terrain
      const pt = { x: object.x ?? 0, y: object.y ?? 0 }
      const index = pttoindex(pt, BOARD_WIDTH)
      if (terrainindexes.has(index)) {
        objectelements.push(object)
      }
    }
  }

  return { objectelements, terrainelements }
}

export function memorywriteterrain(
  board: MAYBE<BOARD>,
  from: MAYBE<BOARD_ELEMENT>,
): MAYBE<BOARD_ELEMENT> {
  if (
    !ispresent(board) ||
    !ispresent(from) ||
    !ispresent(from.x) ||
    !ispresent(from.y) ||
    from.x < 0 ||
    from.x >= BOARD_WIDTH ||
    from.y < 0 ||
    from.y >= BOARD_HEIGHT
  ) {
    return undefined
  }
  const terrain = deepcopy(from)
  const index = from.x + from.y * BOARD_WIDTH
  board.terrain[index] = terrain
  delete board.distmaps
  memorymarkboarddirty(board)
  return board.terrain[index]
}

export function memorywriteterrainfromkind(
  board: MAYBE<BOARD>,
  pt: PT,
  kind: string,
): MAYBE<BOARD_ELEMENT> {
  return memorywriteterrain(board, { ...pt, kind })
}

export function memorysafedeleteelement(
  board: MAYBE<BOARD>,
  element: MAYBE<BOARD_ELEMENT>,
  timestamp: number,
) {
  if (
    !ispresent(element) ||
    memoryreadelementdisplay(element).name === 'player'
  ) {
    return false
  }

  if (element.id) {
    element.removed = timestamp
    memorydeleteboardobjectnamedlookup(board, element)
    // `removed` is a runtime field excluded from BOARD_ELEMENT_SYNC_TOPKEYS, so
    // this mutation by itself does not change the projected board. The element
    // is hard-removed by the next memorydeleteboardobject call (which marks
    // the board dirty). No mark here on purpose.
  } else {
    memorywriteterrain(board, {
      x: element?.x ?? 0,
      y: element?.y ?? 0,
    })
    memorydeleteboardterrainnamed(board, element)
  }
  return true
}

export function memorycreateboard(fn = noop<BOARD>) {
  const board: BOARD = {
    terrain: createempty(),
    objects: {},
    id: '',
    name: '',
  }
  return fn(board)
}
