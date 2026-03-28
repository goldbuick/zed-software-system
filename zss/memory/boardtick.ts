import { createsid, ispid } from 'zss/mapping/guid'
import { MAYBE, ispresent } from 'zss/mapping/types'
import { COLLISION } from 'zss/words/types'

import { memoryreadidorindex } from './boardaccess'
import { memorycodehasdrawdisplay } from './boarddrawdirty'
import { BOOK_RUN_ARGS, memorycleanupboard } from './boardmovement'
import { memoryreadelementkind, memoryreadelementstat } from './boards'
import { BOARD, BOARD_ELEMENT, CODE_PAGE_TYPE } from './types'

const DRAW_LABEL = 'drawdisplay'

export function memorytickboard(
  board: MAYBE<BOARD>,
  timestamp: number,
  includedraw = true,
  drawallowids?: Set<string>,
) {
  const args: BOOK_RUN_ARGS[] = []

  function addelementrun(
    element: BOARD_ELEMENT,
    type: CODE_PAGE_TYPE,
    pass: 'tick' | 'draw',
  ) {
    if (pass === 'draw' && !includedraw) {
      return
    }
    const kind = memoryreadelementkind(element)
    const code = `${kind?.code ?? ''}\n${element.code ?? ''}`
    if (!code) {
      return
    }
    if (pass === 'draw' && !memorycodehasdrawdisplay(code)) {
      return
    }

    const readid =
      element.id ?? `${memoryreadidorindex(element) ?? createsid()}`
    if (
      pass === 'draw' &&
      ispresent(drawallowids) &&
      !drawallowids.has(readid)
    ) {
      return
    }
    args.push({
      id: pass === 'draw' ? `draw_${type}_${readid}` : readid,
      type,
      code,
      object: type === CODE_PAGE_TYPE.OBJECT ? element : undefined,
      terrain: type === CODE_PAGE_TYPE.TERRAIN ? element : undefined,
      pass,
      label: pass === 'draw' ? DRAW_LABEL : '',
    })
  }

  if (!ispresent(board)) {
    return args
  }

  function isactiveobject(object: BOARD_ELEMENT) {
    if (!object.removed) {
      return true
    }
    const delta = timestamp - object.removed
    const cycle = memoryreadelementstat(object, 'cycle')
    return delta <= cycle
  }

  function processlist(list: BOARD_ELEMENT[]) {
    for (let i = 0; i < list.length; ++i) {
      const object = list[i]
      if (!ispresent(object.id)) {
        continue
      }
      if (!isactiveobject(object)) {
        continue
      }
      object.lx = object.x
      object.ly = object.y
      addelementrun(object, CODE_PAGE_TYPE.OBJECT, 'tick')
    }
  }

  // scan terrain
  for (let i = 0; i < board.terrain.length; ++i) {
    const terrain = board.terrain[i]
    if (!ispresent(terrain)) {
      continue
    }
    addelementrun(terrain, CODE_PAGE_TYPE.TERRAIN, 'draw')
  }

  // scan objects
  const allobjects = Object.values(board.objects)
  for (let i = 0; i < allobjects.length; ++i) {
    const object = allobjects[i]
    if (!ispresent(object.id) || !isactiveobject(object)) {
      continue
    }
    addelementrun(object, CODE_PAGE_TYPE.OBJECT, 'draw')
  }

  const objects = allobjects
  const otherlist: BOARD_ELEMENT[] = []
  const ghostlist: BOARD_ELEMENT[] = []
  const playerlist: BOARD_ELEMENT[] = []
  const bulletwaterlist: BOARD_ELEMENT[] = []

  for (let i = 0; i < objects.length; ++i) {
    const el = objects[i]
    if (ispid(el.id)) {
      playerlist.push(el)
    } else {
      switch (memoryreadelementstat(el, 'collision')) {
        case COLLISION.ISSWIM:
        case COLLISION.ISBULLET:
          bulletwaterlist.push(el)
          break
        case COLLISION.ISGHOST:
          ghostlist.push(el)
          break
        default:
          otherlist.push(el)
          break
      }
    }
  }

  processlist(bulletwaterlist)
  processlist(playerlist)
  processlist(otherlist)
  processlist(ghostlist)

  const stopids = memorycleanupboard(board, timestamp)
  for (let i = 0; i < stopids.length; ++i) {
    args.push({
      id: stopids[i],
      type: CODE_PAGE_TYPE.ERROR,
      code: '',
      object: undefined,
      terrain: undefined,
      pass: 'tick',
      label: '',
    })
  }
  return args
}
