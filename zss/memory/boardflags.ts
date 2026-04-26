import { createchipid } from 'zss/chip'
import { isarray, ispresent, isstring } from 'zss/mapping/types'

import { memoryreadboardbyaddress } from './boards'
import { memoryreadbookbysoftware } from './session'
import { BOARD_ELEMENT, MEMORY_LABEL } from './types'

const CHIP_MEM_SUFFIX = '_chip'

function chipmemidstem(chipmemid: string): string {
  if (!chipmemid.endsWith(CHIP_MEM_SUFFIX)) {
    return ''
  }
  return chipmemid.slice(0, -CHIP_MEM_SUFFIX.length)
}

function memoryforeachboardelement(
  boardaddress: string,
  fn: (element: BOARD_ELEMENT) => void,
): void {
  const board = memoryreadboardbyaddress(boardaddress)
  if (!ispresent(board)) {
    return
  }
  const objects = board.objects
  if (ispresent(objects) && typeof objects === 'object') {
    const keys = Object.keys(objects)
    for (let i = 0; i < keys.length; ++i) {
      const el = objects[keys[i]]
      if (ispresent(el) && isstring(el.id) && el.id) {
        fn(el)
      }
    }
  }
  if (isarray(board.terrain)) {
    for (let t = 0; t < board.terrain.length; ++t) {
      const el = board.terrain[t]
      if (ispresent(el) && isstring(el.id) && el.id) {
        fn(el)
      }
    }
  }
}

function memorycollectboardelementids(boardaddress: string): Set<string> {
  const ids = new Set<string>()
  memoryforeachboardelement(boardaddress, (element) => {
    const eid = element.id ?? ''
    if (isstring(eid) && eid) {
      ids.add(eid)
    }
  })
  return ids
}

/** Flags bag id for board-direction tracking state (`memoryreadflags`). */
export function memorytrackingflagsbagid(boardaddress: string): string {
  return `${boardaddress}_tracking`
}

/**
 * Chip flag bag ids for a board: one per on-board element id, plus any
 * `mainbook.flags` `*_chip` keys whose stem element is still on the board.
 */
export function memorycollectchipmemidsforboard(
  boardaddress: string,
): string[] {
  const elementids = memorycollectboardelementids(boardaddress)
  const chipmemids = new Set<string>()
  for (const id of elementids) {
    chipmemids.add(createchipid(id))
  }
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (ispresent(mainbook?.flags) && typeof mainbook.flags === 'object') {
    const keys = Object.keys(mainbook.flags)
    for (let i = 0; i < keys.length; ++i) {
      const k = keys[i]
      if (!k.endsWith(CHIP_MEM_SUFFIX)) {
        continue
      }
      const stem = chipmemidstem(k)
      if (stem && elementids.has(stem)) {
        chipmemids.add(k)
      }
    }
  }
  return [...chipmemids]
}
