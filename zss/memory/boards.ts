/**
 * Board and element read/write, board navigation. Uses codepages, boardelement, boardlookup, boardoperations, codepageoperations.
 */
import { pttoindex } from 'zss/mapping/2d'
import { CYCLE_DEFAULT } from 'zss/mapping/tick'
import { MAYBE, isnumber, ispresent, isstring } from 'zss/mapping/types'
import {
  EVAL_DIR,
  dirfrompts,
  mapstrdir,
  mapstrdirtoconst,
} from 'zss/words/dir'
import { STR_KIND } from 'zss/words/kind'
import { COLLISION, DIR, PT } from 'zss/words/types'

import { memoryapplyboardelementcolor } from './boardelement'
import {
  memorycreateboardobjectfromkind,
  memorywriteterrainfromkind,
} from './boardlifecycle'
import {
  memoryresetboardlookups,
  memorywriteboardnamed,
  memorywriteboardobjectlookup,
} from './boardlookup'
import {
  memoryreadcodepagedata,
  memoryreadcodepagestat,
} from './codepageoperations'
import { memorypickcodepagewithtypeandstat } from './codepages'
import {
  BOARD,
  BOARD_ELEMENT,
  BOARD_ELEMENT_STAT,
  BOARD_WIDTH,
  CODE_PAGE_TYPE,
} from './types'
import {
  memoryensureboardelementruntime,
  memoryensureboardruntime,
  memoryreadboardelementruntime,
} from './runtimeboundary'

export function memoryreadelementkind(
  element: MAYBE<BOARD_ELEMENT>,
): MAYBE<BOARD_ELEMENT> {
  const runtimedata = ispresent(element)
    ? memoryensureboardelementruntime(element)
    : undefined
  if (ispresent(runtimedata?.kinddata)) {
    return runtimedata.kinddata
  }
  if (!isstring(element?.kind) || !element.kind) {
    return undefined
  }
  const maybeobject = memorypickcodepagewithtypeandstat(
    CODE_PAGE_TYPE.OBJECT,
    element.kind,
  )
  if (ispresent(maybeobject)) {
    runtimedata!.kinddata = memoryreadcodepagedata<CODE_PAGE_TYPE.OBJECT>(maybeobject)
    return runtimedata!.kinddata
  }
  const maybeterrain = memorypickcodepagewithtypeandstat(
    CODE_PAGE_TYPE.TERRAIN,
    element.kind,
  )
  if (ispresent(maybeterrain)) {
    runtimedata!.kinddata = memoryreadcodepagedata<CODE_PAGE_TYPE.TERRAIN>(maybeterrain)
    return runtimedata!.kinddata
  }
  return undefined
}

export function memoryreadelementstat(
  element: MAYBE<BOARD_ELEMENT>,
  stat: BOARD_ELEMENT_STAT | 'sky',
) {
  const kind = memoryreadboardelementruntime(element)?.kinddata
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
    memorypickcodepagewithtypeandstat(CODE_PAGE_TYPE.OBJECT, kindid) ??
    memorypickcodepagewithtypeandstat(CODE_PAGE_TYPE.TERRAIN, kindid)
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
  const maybeobject = memorypickcodepagewithtypeandstat(
    CODE_PAGE_TYPE.OBJECT,
    name,
  )
  if (ispresent(maybeobject)) {
    const object = memorycreateboardobjectfromkind(board, dest, name, id)
    if (ispresent(object)) {
      memoryapplyboardelementcolor(object, maybecolor)
      memoryreadelementkind(object)
      memorywriteboardobjectlookup(board, object)
      memorywriteboardnamed(board, object)
      return object
    }
  }
  const maybeterrain = memorypickcodepagewithtypeandstat(
    CODE_PAGE_TYPE.TERRAIN,
    name,
  )
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
  const maybeobject = memorypickcodepagewithtypeandstat(
    CODE_PAGE_TYPE.OBJECT,
    name,
  )
  if (ispresent(maybeobject)) {
    const object = memorycreateboardobjectfromkind(board, dest, name)
    memoryapplyboardelementcolor(object, maybecolor)
    return object
  }
  return undefined
}

export function memoryreadboardbyaddress(address: string): MAYBE<BOARD> {
  const maybeboard = memorypickcodepagewithtypeandstat(
    CODE_PAGE_TYPE.BOARD,
    address,
  )
  return memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(maybeboard)
}

export function memoryreadoverboard(board: MAYBE<BOARD>): MAYBE<BOARD> {
  if (!ispresent(board)) {
    return
  }
  const boardruntime = memoryensureboardruntime(board)
  if (!isstring(board.over)) {
    delete boardruntime.overboard
    return undefined
  }
  if (isstring(boardruntime.overboard)) {
    const maybeover = memoryreadboardbyaddress(boardruntime.overboard)
    if (ispresent(maybeover)) {
      return maybeover
    }
    delete boardruntime.overboard
    return undefined
  }
  const maybeover = memoryreadboardbyaddress(board.over)
  if (ispresent(maybeover)) {
    boardruntime.overboard = maybeover.id
    return maybeover
  }
  return undefined
}

export function memoryreadunderboard(board: MAYBE<BOARD>): MAYBE<BOARD> {
  if (!ispresent(board)) {
    return
  }
  const boardruntime = memoryensureboardruntime(board)
  if (!isstring(board.under)) {
    delete boardruntime.underboard
    return undefined
  }
  if (isstring(boardruntime.underboard)) {
    const maybeunder = memoryreadboardbyaddress(boardruntime.underboard)
    if (ispresent(maybeunder)) {
      return maybeunder
    }
    delete boardruntime.underboard
    return undefined
  }
  const maybeunder = memoryreadboardbyaddress(board.under)
  if (ispresent(maybeunder)) {
    boardruntime.underboard = maybeunder.id
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

export function memoryinitboard(board: MAYBE<BOARD>) {
  if (!ispresent(board)) {
    return
  }
  for (let i = 0; i < board.terrain.length; ++i) {
    memoryreadelementkind(board.terrain[i])
  }
  const oids = Object.keys(board.objects)
  for (let i = 0; i < oids.length; ++i) {
    const id = oids[i]
    memoryreadelementkind(board.objects[id])
  }
  memoryresetboardlookups(board)
}
