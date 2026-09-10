/**
 * Board and element read/write, board navigation. Uses codepages, boardelement, boardlookup, codepageoperations.
 */
import { pttoindex } from 'zss/mapping/2d'
import { CYCLE_DEFAULT } from 'zss/mapping/tick'
import {
  MAYBE,
  isnumber,
  ispresent,
  isstring,
} from 'zss/mapping/types'
import {
  EVAL_DIR,
  dirfrompts,
  mapstrdir,
  mapstrdirtoconst,
} from 'zss/words/dir'
import { STR_KIND } from 'zss/words/kind'
import {
  CATEGORY,
  COLLISION,
  DIR,
  NAME,
  PT,
} from 'zss/words/types'
import {
  memoryapplyboardelementcolor,
  memoryboardelementisobject,
} from './boardelement'
import {
  memorycreateboardobjectfromkind,
  memoryunlinkboardobject,
  memorywriteterrainfromkind,
} from './boardlifecycle'
import {
  memorydeleteboardobjectnamedlookup,
  memorydeleteboardterrainnamed,
  memoryrebuildboardnamed,
  memorywriteboardnamed,
} from './boardlookup'
import {
  memoryreadcodepagedata,
  memoryreadcodepagestat,
} from './codepageoperations'
import { memoryreadcodepage } from './bookoperations'
import { memorypickcodepage } from './codepages'
import {
  BOARD,
  BOARD_ELEMENT,
  BOARD_ELEMENT_STAT,
  BOARD_HEIGHT,
  BOARD_WIDTH,
  CODE_PAGE,
  CODE_PAGE_TYPE,
} from './types'
import { memoryreadbooklist } from './session'
function memorykinddataisfresh(
  element: BOARD_ELEMENT,
  cached: BOARD_ELEMENT,
): boolean {
  const pageid = element.kindsourcepageid
  if (!isstring(pageid) || !pageid) {
    return false
  }
  const page = memoryreadcodepage(memoryreadbooklist(), pageid)
  return ispresent(page) && cached.code === page.code
}

function memoryapplykinddatafrompage(
  element: BOARD_ELEMENT,
  page: CODE_PAGE,
  type: CODE_PAGE_TYPE.OBJECT | CODE_PAGE_TYPE.TERRAIN,
  kind: string,
): MAYBE<BOARD_ELEMENT> {
  const kinddata =
    type === CODE_PAGE_TYPE.OBJECT
      ? memoryreadcodepagedata<CODE_PAGE_TYPE.OBJECT>(page)
      : memoryreadcodepagedata<CODE_PAGE_TYPE.TERRAIN>(page)
  if (!ispresent(kinddata)) {
    return undefined
  }
  element.kinddata = kinddata
  element.kindsourcepageid = page.id
  element.kindsourcekind = NAME(kind)
  return kinddata
}

export function memoryclearelementkinddata(
  element: MAYBE<BOARD_ELEMENT>,
): void {
  if (!ispresent(element)) {
    return
  }
  delete element.kinddata
  delete element.kindsourcepageid
  delete element.kindsourcekind
}

export function memoryreadelementkind(
  element: MAYBE<BOARD_ELEMENT>,
): MAYBE<BOARD_ELEMENT> {
  if (!ispresent(element) || !isstring(element.kind) || !element.kind) {
    return undefined
  }

  // Hot path: exists -> kind match -> fresh, before any book scan pick.
  const cached = element.kinddata
  if (ispresent(cached)) {
    const kindname = NAME(element.kind)
    if (
      kindname === element.kindsourcekind &&
      memorykinddataisfresh(element, cached)
    ) {
      return cached
    }
  }

  // Cold path: pick once, rebuild kinddata, stamp kindsourcepageid.
  const maybeobject = memorypickcodepage(memoryreadbooklist(), CODE_PAGE_TYPE.OBJECT,
    element.kind,)
  if (ispresent(maybeobject)) {
    return memoryapplykinddatafrompage(
      element,
      maybeobject,
      CODE_PAGE_TYPE.OBJECT,
      element.kind,
    )
  }
  const maybeterrain = memorypickcodepage(memoryreadbooklist(), CODE_PAGE_TYPE.TERRAIN,
    element.kind,)
  if (ispresent(maybeterrain)) {
    return memoryapplykinddatafrompage(
      element,
      maybeterrain,
      CODE_PAGE_TYPE.TERRAIN,
      element.kind,
    )
  }
  // No codepage yet (make-it stub / unit fixtures): keep existing kinddata.
  return element.kinddata
}

export function memoryreadelementstat(
  element: MAYBE<BOARD_ELEMENT>,
  stat: BOARD_ELEMENT_STAT | 'sky',
) {
  const kind = element?.kinddata
  const kindid = kind?.id ?? ''
  const elementstat = element?.[stat as keyof BOARD_ELEMENT]
  if (ispresent(elementstat)) {
    return elementstat
  }
  const kindstat = kind?.[stat as keyof BOARD_ELEMENT]
  if (ispresent(kindstat)) {
    return kindstat
  }
  const codepage =
    memorypickcodepage(memoryreadbooklist(), CODE_PAGE_TYPE.OBJECT, kindid) ??
    memorypickcodepage(memoryreadbooklist(), CODE_PAGE_TYPE.TERRAIN, kindid)
  const codepagestat = memoryreadcodepagestat(codepage, stat)
  if (ispresent(codepagestat)) {
    return codepagestat
  }
  switch (stat) {
    case 'group':
      return ''
    case 'cycle':
      return CYCLE_DEFAULT
    case 'p1':
    case 'p2':
    case 'p3':
    case 'p4':
    case 'p5':
    case 'p6':
    case 'p7':
    case 'p8':
    case 'p9':
    case 'p10':
    case 'p11':
    case 'p12':
    case 'p13':
    case 'p14':
    case 'p15':
    case 'p16':
    case 'p17':
    case 'p18':
    case 'p19':
    case 'p20':
    case 'item':
    case 'pushable':
    case 'breakable':
      return 0
    case 'collision':
      return COLLISION.ISWALK
    default:
      return undefined
  }
}

export function memorycheckelementpushable(
  pusher: MAYBE<BOARD_ELEMENT>,
  target: MAYBE<BOARD_ELEMENT>,
) {
  const pusherpt: PT = { x: pusher?.x ?? -1, y: pusher?.y ?? -1 }
  const targetpt: PT = { x: target?.x ?? -1, y: target?.y ?? -1 }
  const pushdir = dirfrompts(pusherpt, targetpt)
  const pushable = memoryreadelementstat(target, 'pushable')
  if (isnumber(pushable)) {
    return pushable !== 0
  }
  if (isstring(pushable)) {
    return pushable
      .trim()
      .split(' ')
      .map((str) => mapstrdirtoconst(mapstrdir(str)))
      .some((dir) => dir === pushdir)
  }
  return false
}

/**
 * In-place object kind change: drop instance code + kinddata, set kind.
 * Object -> object keeps id. Object -> terrain moves onto the terrain layer.
 * Returns false if element is not an object or kind is missing.
 */
export function memorymorphboardobject(
  board: MAYBE<BOARD>,
  element: MAYBE<BOARD_ELEMENT>,
  kind: MAYBE<STR_KIND>,
): boolean {
  if (
    !ispresent(board) ||
    !ispresent(element) ||
    !ispresent(kind) ||
    !ispresent(element.id) ||
    !memoryboardelementisobject(element)
  ) {
    return false
  }
  const [kindname] = kind
  const objectpage = memorypickcodepage(memoryreadbooklist(), CODE_PAGE_TYPE.OBJECT,
    kindname,)
  const isterraintarget = !ispresent(objectpage)
  const terrainpage = isterraintarget
    ? memorypickcodepage(memoryreadbooklist(), CODE_PAGE_TYPE.TERRAIN, kindname)
    : undefined
  if (!ispresent(objectpage) && !ispresent(terrainpage)) {
    return false
  }
  let terrainindex = -1
  if (isterraintarget) {
    const x = element.x
    const y = element.y
    if (
      !ispresent(x) ||
      !ispresent(y) ||
      x < 0 ||
      x >= BOARD_WIDTH ||
      y < 0 ||
      y >= BOARD_HEIGHT
    ) {
      return false
    }
    terrainindex = x + y * BOARD_WIDTH
  }

  memorydeleteboardobjectnamedlookup(board, element)
  delete element.code
  memoryclearelementkinddata(element)
  element.kind = kindname

  if (ispresent(objectpage)) {
    memoryreadelementkind(element)
    memorywriteboardnamed(board, element)
    return true
  }

  // Object -> terrain: move same element onto the terrain layer.
  const prior = board.terrain[terrainindex]
  if (ispresent(prior)) {
    memoryreadelementkind(prior)
    memorydeleteboardterrainnamed(board, prior)
  }
  const objectid = element.id
  memoryunlinkboardobject(board, objectid)
  delete element.id
  element.category = CATEGORY.ISTERRAIN
  board.terrain[terrainindex] = element
  delete board.distmaps
  memoryreadelementkind(element)
  memorywriteboardnamed(board, element, terrainindex)
  return true
}

export function memorywriteelementfromkind(
  board: MAYBE<BOARD>,
  kind: MAYBE<STR_KIND>,
  dest: PT,
  id?: string,
): MAYBE<BOARD_ELEMENT> {
  if (!ispresent(board) || !ispresent(kind)) {
    return undefined
  }
  const [name, maybecolor] = kind
  const maybeobject = memorypickcodepage(memoryreadbooklist(), CODE_PAGE_TYPE.OBJECT,
    name,)
  if (ispresent(maybeobject)) {
    const object = memorycreateboardobjectfromkind(board, dest, name, id)
    if (ispresent(object)) {
      memoryapplyboardelementcolor(object, maybecolor)
      memoryreadelementkind(object)
      memorywriteboardnamed(board, object)
      return object
    }
  }
  const maybeterrain = memorypickcodepage(memoryreadbooklist(), CODE_PAGE_TYPE.TERRAIN,
    name,)
  if (ispresent(maybeterrain)) {
    const terrain = memorywriteterrainfromkind(board, dest, name)
    if (ispresent(terrain)) {
      memoryapplyboardelementcolor(terrain, maybecolor)
      memoryreadelementkind(terrain)
      const idx = pttoindex(dest, BOARD_WIDTH)
      memorywriteboardnamed(board, terrain, idx)
      return terrain
    }
  }
  return undefined
}

export function memorywritebullet(
  board: MAYBE<BOARD>,
  kind: MAYBE<STR_KIND>,
  dest: PT,
) {
  if (!ispresent(board) || !ispresent(kind)) {
    return undefined
  }
  const [name, maybecolor] = kind
  const maybeobject = memorypickcodepage(memoryreadbooklist(), CODE_PAGE_TYPE.OBJECT,
    name,)
  if (ispresent(maybeobject)) {
    const object = memorycreateboardobjectfromkind(board, dest, name)
    memoryapplyboardelementcolor(object, maybecolor)
    if (ispresent(object)) {
      memoryreadelementkind(object)
      memorywriteboardnamed(board, object)
    }
    return object
  }
  return undefined
}

export function memoryreadboardbyaddress(address: string): MAYBE<BOARD> {
  const maybeboard = memoryreadcodepage(
    memoryreadbooklist(),
    address,
    CODE_PAGE_TYPE.BOARD,
  )
  return memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(maybeboard)
}

export function memoryreadoverboard(board: MAYBE<BOARD>): MAYBE<BOARD> {
  if (!ispresent(board)) {
    return
  }
  if (!isstring(board.over)) {
    delete board.overboard
    return undefined
  }
  if (isstring(board.overboard)) {
    const maybeover = memoryreadboardbyaddress(board.overboard)
    if (ispresent(maybeover)) {
      return maybeover
    }
    delete board.overboard
    return undefined
  }
  const maybeover = memoryreadboardbyaddress(board.over)
  if (ispresent(maybeover)) {
    board.overboard = maybeover.id
    return maybeover
  }
  return undefined
}

export function memoryreadunderboard(board: MAYBE<BOARD>): MAYBE<BOARD> {
  if (!ispresent(board)) {
    return
  }
  if (!isstring(board.under)) {
    delete board.underboard
    return undefined
  }
  if (isstring(board.underboard)) {
    const maybeunder = memoryreadboardbyaddress(board.underboard)
    if (ispresent(maybeunder)) {
      return maybeunder
    }
    delete board.underboard
    return undefined
  }
  const maybeunder = memoryreadboardbyaddress(board.under)
  if (ispresent(maybeunder)) {
    board.underboard = maybeunder.id
    return maybeunder
  }
  return undefined
}

export function memoryreadboardbyevaldir(dir: EVAL_DIR, board: MAYBE<BOARD>) {
  if (!ispresent(board)) {
    return
  }
  switch (dir.layer) {
    case DIR.OVER:
      return memoryreadoverboard(board)
    case DIR.UNDER:
      return memoryreadunderboard(board)
    default:
      return board
  }
}

/** Structural / tools: full kind resolve + wipe/rebuild named. Not for tick path. */
export function memoryinitboard(board: MAYBE<BOARD>) {
  if (!ispresent(board)) {
    return
  }
  memoryrebuildboardnamed(board)
}
