import { indextopt, pttoindex } from 'zss/mapping/2d'
import { ispid } from 'zss/mapping/guid'
import {
  MAYBE,
  isarray,
  isnumber,
  ispresent,
  isstring,
} from 'zss/mapping/types'
import { STR_COLOR, readstrbg, readstrcolor } from 'zss/words/color'
import {
  STR_GROUP,
  readstrgroupbg,
  readstrgroupcolor,
  readstrgroupname,
} from 'zss/words/group'
import {
  STR_KIND,
  readstrkindbg,
  readstrkindcolor,
  readstrkindname,
} from 'zss/words/kind'
import { COLLISION, COLOR, NAME, PT } from 'zss/words/types'

import { memoryboardelementisobject } from './boardelement'
import { memoryreadgroup } from './boardlifecycle'
import { BOARD, BOARD_ELEMENT, BOARD_HEIGHT, BOARD_WIDTH } from './types'

export enum READ_LAYER {
  ANY,
  TERRAIN,
  OBJECT,
  ANYGHOST,
  OBJECTGHOST,
}

export type MEMORY_READ_ELEMENT_LAYER = 'any' | 'object' | 'terrain'

export type MEMORY_LIST_ELEMENT_FILTER = {
  layer?: MEMORY_READ_ELEMENT_LAYER
  includeghost?: boolean
  /** Match display color / bg (STR_COLOR). */
  color?: STR_COLOR
  /** Match kind name (+ optional color/bg). Uses named-index for the kind name. */
  kind?: STR_KIND
  /** Match group (soft name / @group). Requires `self` for self/others. */
  group?: STR_GROUP
  /** Element id used as self for group matching. */
  self?: string
  /** Match display name via board.named index (boardlookup). */
  name?: string
  /**
   * Resolve mixed id / name / pt targets.
   * Strings: object id first, else named-index by NAME(string). PTs: object then terrain.
   */
  ids?: unknown[]
  /** Resolve PT targets the same way as PT entries in `ids`. */
  pts?: PT[]
}

function memoryobjectisghost(object: BOARD_ELEMENT): boolean {
  if (object.collision === COLLISION.ISGHOST) {
    return true
  }
  return object.kinddata?.collision === COLLISION.ISGHOST
}

/** PT duck-type (avoid words/dir ispt so jest mocks of dir stay narrow). */
function memoryisquerypt(value: unknown): value is PT {
  if (!ispresent(value) || typeof value !== 'object') {
    return false
  }
  const pt = value as PT
  return isnumber(pt.x) && isnumber(pt.y)
}

function filterelementdisplay(
  element: MAYBE<BOARD_ELEMENT>,
  name: MAYBE<string>,
  color: MAYBE<COLOR>,
  bg: MAYBE<COLOR>,
) {
  if (!ispresent(element)) {
    return false
  }
  const kind = element.kinddata
  const displayname = NAME(element.name ?? kind?.name)
  const displaycolor =
    element.displaycolor ?? kind?.displaycolor ?? element.color ?? kind?.color
  const displaybg =
    element.displaybg ?? kind?.displaybg ?? element.bg ?? kind?.bg
  if (ispresent(name) && name !== displayname) {
    return false
  }
  if (ispresent(color) && color !== displaycolor) {
    return false
  }
  if (ispresent(bg) && bg !== displaybg) {
    return false
  }
  return true
}

/**
 * Authoritative object-at-cell query. Scans board.objects by x/y.
 * Players win on overlap; ghosts are skipped unless includeghost is set.
 */
function memoryreadobjectatpt(
  board: MAYBE<BOARD>,
  pt: PT,
  includeghost: boolean,
): MAYBE<BOARD_ELEMENT> {
  if (
    !ispresent(board?.objects) ||
    pt.x < 0 ||
    pt.x >= BOARD_WIDTH ||
    pt.y < 0 ||
    pt.y >= BOARD_HEIGHT
  ) {
    return undefined
  }
  const objects = Object.values(board.objects)
  let found: MAYBE<BOARD_ELEMENT>
  for (let i = 0; i < objects.length; ++i) {
    const object = objects[i]
    if (
      object.x !== pt.x ||
      object.y !== pt.y ||
      !ispresent(object.id) ||
      ispresent(object.removed)
    ) {
      continue
    }
    if (!includeghost && memoryobjectisghost(object)) {
      continue
    }
    if (ispid(object.id)) {
      return object
    }
    found ??= object
  }
  return found
}

function memoryreadterraincell(
  board: MAYBE<BOARD>,
  x: number,
  y: number,
): MAYBE<BOARD_ELEMENT> {
  return x >= 0 && x < BOARD_WIDTH && y >= 0 && y < BOARD_HEIGHT
    ? board?.terrain[pttoindex({ x, y }, BOARD_WIDTH)]
    : undefined
}

function memoryreadobjectbyid(
  board: MAYBE<BOARD>,
  id: string,
): MAYBE<BOARD_ELEMENT> {
  if (!board?.objects) {
    return undefined
  }
  return board.objects[id]
}

function memoryreadelementbyidorindex(
  board: MAYBE<BOARD>,
  idorindex: string | number,
): MAYBE<BOARD_ELEMENT> {
  const key = `${idorindex}`
  const maybeobject = memoryreadobjectbyid(board, key)
  if (ispresent(maybeobject)) {
    return maybeobject
  }
  const maybeindex = parseFloat(key)
  const pt = indextopt(isNaN(maybeindex) ? -1 : maybeindex, BOARD_WIDTH)
  return memoryreadterraincell(board, pt.x, pt.y)
}

export function memoryreadidorindex(element: BOARD_ELEMENT) {
  return memoryboardelementisobject(element)
    ? element.id
    : pttoindex({ x: element.x ?? 0, y: element.y ?? 0 }, BOARD_WIDTH)
}

export function memoryboardelementindex(
  board: MAYBE<BOARD>,
  pt: MAYBE<PT | BOARD_ELEMENT>,
): number {
  if (
    !ispresent(board) ||
    !ispresent(pt?.x) ||
    !ispresent(pt?.y) ||
    pt.x < 0 ||
    pt.x >= BOARD_WIDTH ||
    pt.y < 0 ||
    pt.y >= BOARD_HEIGHT
  ) {
    return -1
  }
  return pttoindex({ x: pt.x, y: pt.y }, BOARD_WIDTH)
}

/**
 * Unified board element read.
 * - ANY / ANYGHOST: object-at-pt then terrain (ghosts only with ANYGHOST)
 * - OBJECT / OBJECTGHOST: object layer only
 * - TERRAIN: terrain only
 * - string / number: object by id, else terrain by numeric index (ANY / ANYGHOST)
 */
export function memoryreadelement(
  board: MAYBE<BOARD>,
  query: PT | string | number,
  layer: READ_LAYER,
): MAYBE<BOARD_ELEMENT> {
  const includeghost =
    layer === READ_LAYER.ANYGHOST || layer === READ_LAYER.OBJECTGHOST
  const objectonly =
    layer === READ_LAYER.OBJECT || layer === READ_LAYER.OBJECTGHOST
  const terrainonly = layer === READ_LAYER.TERRAIN

  if (memoryisquerypt(query)) {
    if (objectonly) {
      return memoryreadobjectatpt(board, query, includeghost)
    }
    if (terrainonly) {
      return memoryreadterraincell(board, query.x, query.y)
    }
    const index = memoryboardelementindex(board, query)
    if (index < 0 || !ispresent(board)) {
      return undefined
    }
    const object = memoryreadobjectatpt(board, query, includeghost)
    if (ispresent(object)) {
      return object
    }
    return board.terrain[index]
  }

  if (isstring(query) || isnumber(query)) {
    if (objectonly) {
      return memoryreadobjectbyid(board, `${query}`)
    }
    if (terrainonly) {
      const maybeindex = parseFloat(`${query}`)
      const pt = indextopt(isNaN(maybeindex) ? -1 : maybeindex, BOARD_WIDTH)
      return memoryreadterraincell(board, pt.x, pt.y)
    }
    return memoryreadelementbyidorindex(board, query)
  }

  return undefined
}

/** Nearest element to pt (by Euclidean distance). */
export function memorypicknearest(
  pt: PT,
  items: MAYBE<BOARD_ELEMENT>[],
): MAYBE<BOARD_ELEMENT> {
  let ndist = 0
  let nearest: MAYBE<BOARD_ELEMENT>

  for (let i = 0; i < items.length; ++i) {
    const item = items[i]
    if (item) {
      const ix = pt.x - (item.x ?? 0)
      const iy = pt.y - (item.y ?? 0)
      const idist = Math.sqrt(ix * ix + iy * iy)
      if (nearest === undefined || idist < ndist) {
        ndist = idist
        nearest = item
      }
    }
  }

  return nearest
}

/**
 * Resolve board.named (maintained by boardlookup) to elements.
 * Fast path -- do not full-scan terrain/objects for name lookups.
 */
function memorylistelementbynamedindex(
  board: MAYBE<BOARD>,
  name: string,
): BOARD_ELEMENT[] {
  const maybeset = board?.named?.[name]
  if (!ispresent(maybeset)) {
    return []
  }
  const named = [...maybeset.values()]
  return named
    .map((idorindex) => {
      if (typeof idorindex === 'string') {
        return board?.objects[idorindex]
      }
      return board?.terrain[idorindex]
    })
    .filter(ispresent)
}

function memorylistelementbyidnameorpts(
  board: BOARD,
  idnameorpts: unknown[],
): BOARD_ELEMENT[] {
  return idnameorpts
    .map((idnameorpt) => {
      if (typeof idnameorpt === 'string') {
        const maybebyid = board.objects[idnameorpt]
        if (ispresent(maybebyid)) {
          return maybebyid
        }
        const maybebyname = memorylistelementbynamedindex(
          board,
          NAME(idnameorpt),
        )
        if (maybebyname.length) {
          return maybebyname
        }
      } else if (
        memoryisquerypt(idnameorpt) &&
        idnameorpt.x >= 0 &&
        idnameorpt.x < BOARD_WIDTH &&
        idnameorpt.y >= 0 &&
        idnameorpt.y < BOARD_HEIGHT
      ) {
        const idx = idnameorpt.x + idnameorpt.y * BOARD_WIDTH
        const maybeobject = memoryreadobjectatpt(board, idnameorpt, false)
        return ispresent(maybeobject) ? maybeobject : board.terrain[idx]
      }
      return undefined
    })
    .flat()
    .filter(ispresent)
}

function memorylistelementbycolor(
  board: BOARD,
  strcolor: STR_COLOR,
): BOARD_ELEMENT[] {
  const color = ispresent(strcolor) ? readstrcolor(strcolor) : undefined
  const bg = ispresent(strcolor) ? readstrbg(strcolor) : undefined
  const elements: BOARD_ELEMENT[] = []
  for (let i = 0; i < board.terrain.length; ++i) {
    const terrain = board.terrain[i]
    if (
      ispresent(terrain) &&
      filterelementdisplay(terrain, undefined, color, bg)
    ) {
      elements.push(terrain)
    }
  }
  const objects = Object.values(board.objects)
  for (let i = 0; i < objects.length; ++i) {
    const object = objects[i]
    if (filterelementdisplay(object, undefined, color, bg)) {
      elements.push(object)
    }
  }
  return elements
}

function memorylistelementbylayer(
  board: BOARD,
  layer: MEMORY_READ_ELEMENT_LAYER,
): BOARD_ELEMENT[] {
  if (layer === 'object') {
    return [...Object.values(board.objects)]
  }
  if (layer === 'terrain') {
    return board.terrain.filter(ispresent)
  }
  return [...board.terrain.filter(ispresent), ...Object.values(board.objects)]
}

/**
 * List board elements by composed filter.
 * Primary modes (first match wins): ids/pts, kind, name, group, color, else layer.
 * `name` / kind-name use board.named (boardlookup index), not a full scan.
 */
export function memorylistelement(
  board: MAYBE<BOARD>,
  filter?: MEMORY_LIST_ELEMENT_FILTER,
): BOARD_ELEMENT[] {
  if (!ispresent(board)) {
    return []
  }

  const idnameorpts: unknown[] = [
    ...(isarray(filter?.ids) ? filter.ids : []),
    ...(isarray(filter?.pts) ? filter.pts : []),
  ]
  if (idnameorpts.length > 0) {
    return memorylistelementbyidnameorpts(board, idnameorpts)
  }

  if (ispresent(filter?.kind)) {
    const name = readstrkindname(filter.kind)
    const color = readstrkindcolor(filter.kind)
    const bg = readstrkindbg(filter.kind)
    return memorylistelementbynamedindex(board, name ?? '').filter((element) =>
      filterelementdisplay(element, name, color, bg),
    )
  }

  if (isstring(filter?.name)) {
    return memorylistelementbynamedindex(board, filter.name)
  }

  if (ispresent(filter?.group)) {
    const self = filter.self ?? ''
    const groupname = NAME(readstrgroupname(filter.group) ?? '')
    const color = readstrgroupcolor(filter.group)
    const bg = readstrgroupbg(filter.group)
    const { terrainelements, objectelements } = memoryreadgroup(
      board,
      self,
      groupname,
    )
    return [...terrainelements, ...objectelements].filter((element) =>
      filterelementdisplay(element, undefined, color, bg),
    )
  }

  if (ispresent(filter?.color)) {
    return memorylistelementbycolor(board, filter.color)
  }

  const layer = filter?.layer ?? 'object'
  return memorylistelementbylayer(board, layer)
}

export function memoryfindboardplayer(
  board: MAYBE<BOARD>,
  target: MAYBE<BOARD_ELEMENT>,
  player: string,
): MAYBE<BOARD_ELEMENT> {
  if (!ispresent(board) || !ispresent(target)) {
    return undefined
  }
  const playerobject = board.objects[player]
  if (ispresent(playerobject)) {
    return playerobject
  }
  if (!memoryisquerypt(target)) {
    return undefined
  }
  return memorypicknearest(target, memorylistelement(board, { name: 'player' }))
}

export function memoryreadplayersonboard(board: MAYBE<BOARD>): string[] {
  if (!ispresent(board)) {
    return []
  }
  return Object.keys(board.objects).filter(ispid)
}
