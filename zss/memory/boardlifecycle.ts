import {
  FORMAT_OBJECT,
  FORMAT_SKIP,
  formatobject,
  unformatobject,
} from 'zss/feature/format'
import { pttoindex } from 'zss/mapping/2d'
import { createsid } from 'zss/mapping/guid'
import { MAYBE, deepcopy, ispresent, noop } from 'zss/mapping/types'
import {
  STR_GROUP,
  readstrgroupbg,
  readstrgroupcolor,
  readstrgroupname,
} from 'zss/words/group'
import { CATEGORY, COLOR, NAME, PT } from 'zss/words/types'

import {
  memoryexportboardelement,
  memoryexportboardelementasjson,
  memoryimportboardelement,
} from './boardelement'
import {
  memorydeleteboardobjectnamedlookup,
  memorydeleteboardterrainnamed,
  memorywriteboardnamed,
  memorywriteboardobjectlookup,
} from './boardlookup'
import { memoryreadelementkind, memoryreadelementstat } from './boards'
import { memoryexportterrainelement } from './boardterrainmap'
import { memoryreadelementdisplay } from './bookoperations'
import {
  memorydeleteboardelementruntime,
  memoryensureboardelementruntime,
  memoryensureboardruntime,
  memoryreadboardruntime,
} from './runtimeboundary'
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
    memorydeleteboardobjectnamedlookup(board, board.objects[id])
    memorydeleteboardelementruntime(board.objects[id])
    delete board.objects[id]
    return true
  }
  return false
}

/** Remove object from a board without destroying its runtime (board hop / relocate). */
export function memoryunlinkboardobject(board: MAYBE<BOARD>, id: string) {
  if (ispresent(board?.objects[id])) {
    memorydeleteboardobjectnamedlookup(board, board.objects[id])
    delete board.objects[id]
    return true
  }
  return false
}

export function memoryexportboard(
  board: MAYBE<BOARD>,
  strip?: boolean,
): MAYBE<FORMAT_OBJECT> {
  return formatobject(board, BOARD_KEYS, {
    terrain: (terrain: MAYBE<BOARD_ELEMENT>[]) =>
      terrain.map((element) =>
        memoryexportboardelement(memoryexportterrainelement(element, strip)),
      ),
    objects: (elements) => {
      const objects = Object.values<BOARD_ELEMENT>(elements)
        .filter((boardelement) => !boardelement.removed)
        .map(memoryexportboardelement)
      return objects
    },
    id: FORMAT_SKIP,
    name: FORMAT_SKIP,
    runtime: FORMAT_SKIP,
  })
}

export function memoryexportboardasjson(
  board: MAYBE<BOARD>,
  strip?: boolean,
): any {
  if (!ispresent(board)) {
    return undefined
  }
  const objects: Record<string, any> = {}
  for (const object of Object.values(board.objects ?? {})) {
    objects[object.id ?? ''] = memoryexportboardelementasjson(object)
  }
  return {
    terrain: board.terrain.map((element) =>
      memoryexportboardelementasjson(
        memoryexportterrainelement(element, strip),
      ),
    ),
    objects,
    // stats
    isdark: board.isdark,
    startx: board.startx,
    starty: board.starty,
    over: board.over,
    under: board.under,
    camera: board.camera,
    graphics: board.graphics,
    facing: board.facing,
    charset: board.charset,
    palette: board.palette,
    exitnorth: board.exitnorth,
    exitsouth: board.exitsouth,
    exitwest: board.exitwest,
    exiteast: board.exiteast,
    timelimit: board.timelimit,
    restartonzap: board.restartonzap,
    maxplayershots: board.maxplayershots,
    b1: board.b1,
    b2: board.b2,
    b3: board.b3,
    b4: board.b4,
    b5: board.b5,
    b6: board.b6,
    b7: board.b7,
    b8: board.b8,
    b9: board.b9,
    b10: board.b10,
  }
}

export function memoryimportboard(
  boardentry: MAYBE<FORMAT_OBJECT>,
): MAYBE<BOARD> {
  const board = unformatobject<BOARD>(boardentry, BOARD_KEYS, {
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
  if (!ispresent(board)) {
    return undefined
  }
  memoryensureboardruntime(board)
  return board
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
  object.runtime = ''
  const runtime = memoryensureboardelementruntime(object)
  runtime.category = CATEGORY.ISOBJECT
  board.objects[object.id] = object
  memoryreadelementkind(object)
  memorywriteboardnamed(board, object)
  memorywriteboardobjectlookup(board, object)
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

export function memoryelementisingroup(
  element: MAYBE<BOARD_ELEMENT>,
  self: string,
  targetgroup: string,
  isterrain: boolean,
): boolean {
  if (!ispresent(element) || element.removed) {
    return false
  }
  switch (targetgroup) {
    case 'all':
      return true
    case 'self':
      return element.id === self
    case 'others':
      return element.id !== self
    case 'terrain':
      return isterrain === true
    case 'object':
      return isterrain === false
  }
  const statnamed = memoryreadelementstat(
    element,
    targetgroup as BOARD_ELEMENT_STAT,
  )
  return (
    ispresent(statnamed) ||
    memoryreadelementdisplay(element).name === targetgroup ||
    memoryreadelementstat(element, 'group') === targetgroup
  )
}

function elementmatchesstrgroupcolorbg(
  element: BOARD_ELEMENT,
  color: MAYBE<COLOR>,
  bg: MAYBE<COLOR>,
): boolean {
  if (!ispresent(color) && !ispresent(bg)) {
    return true
  }
  const display = memoryreadelementdisplay(element)
  if (ispresent(color) && color !== display.color) {
    return false
  }
  if (ispresent(bg) && bg !== display.bg) {
    return false
  }
  return true
}

export function memoryelementmatchesstrgroup(
  element: MAYBE<BOARD_ELEMENT>,
  self: string,
  group: STR_GROUP,
  isterrain: boolean,
): boolean {
  if (!ispresent(element)) {
    return false
  }
  const name = NAME(readstrgroupname(group) ?? '')
  if (!memoryelementisingroup(element, self, name, isterrain)) {
    return false
  }
  return elementmatchesstrgroupcolorbg(
    element,
    readstrgroupcolor(group),
    readstrgroupbg(group),
  )
}

/** Object-layer dest: object itself, or terrain under it (same as memoryreadgroup). */
export function memoryelementmatchesstrgrouponboard(
  board: MAYBE<BOARD>,
  element: MAYBE<BOARD_ELEMENT>,
  self: string,
  group: STR_GROUP,
  isterrain: boolean,
): boolean {
  if (memoryelementmatchesstrgroup(element, self, group, isterrain)) {
    return true
  }
  if (isterrain || !ispresent(board) || !ispresent(element)) {
    return false
  }
  const index = pttoindex({ x: element.x ?? 0, y: element.y ?? 0 }, BOARD_WIDTH)
  return memoryelementmatchesstrgroup(board.terrain[index], self, group, true)
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

  // first pass collect terrain elements
  const terrainindexes = new Set<number>()
  for (let i = 0; i < BOARD_SIZE; ++i) {
    const maybeterrain: MAYBE<BOARD_ELEMENT> = board.terrain[i]
    if (
      ispresent(maybeterrain) &&
      memoryelementisingroup(maybeterrain, self, targetgroup, true)
    ) {
      terrainelements.push(maybeterrain)
      terrainindexes.add(i)
    }
  }

  // second pass collect object elements
  const allobjects = Object.values(board.objects)
  for (let i = 0; i < allobjects.length; ++i) {
    const object = allobjects[i]
    if (memoryelementisingroup(object, self, targetgroup, false)) {
      objectelements.push(object)
    } else {
      const pt = { x: object.x ?? 0, y: object.y ?? 0 }
      const index = pttoindex(pt, BOARD_WIDTH)
      if (terrainindexes.has(index)) {
        objectelements.push(object)
      }
    }
  }

  return { objectelements, terrainelements }
}

export function memorylistboardelementsbygroup(
  board: MAYBE<BOARD>,
  self: string,
  group: STR_GROUP,
): BOARD_ELEMENT[] {
  const name = NAME(readstrgroupname(group) ?? '')
  const color = readstrgroupcolor(group)
  const bg = readstrgroupbg(group)
  const { terrainelements, objectelements } = memoryreadgroup(board, self, name)
  const elements = [...terrainelements, ...objectelements]
  return elements.filter((element) =>
    elementmatchesstrgroupcolorbg(element, color, bg),
  )
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
  const index = from.x + from.y * BOARD_WIDTH
  const prior = board.terrain[index]
  if (ispresent(prior)) {
    memoryreadelementkind(prior)
    memorydeleteboardterrainnamed(board, prior)
  }
  const terrain = deepcopy(from)
  terrain.runtime = ''
  const runtime = memoryensureboardelementruntime(terrain)
  runtime.category = CATEGORY.ISTERRAIN
  board.terrain[index] = terrain
  const boardruntime = memoryreadboardruntime(board)
  if (ispresent(boardruntime)) {
    delete boardruntime.distmaps
  }
  if (ispresent(terrain.kind) && terrain.kind) {
    memoryreadelementkind(terrain)
    memorywriteboardnamed(board, terrain, index)
  }
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
    runtime: '',
  }
  memoryensureboardruntime(board)
  return fn(board)
}
