import { ispresent } from 'zss/mapping/types'
import { memoryreadboardbyaddress } from 'zss/memory/boards'
import { memoryclearbookcodepage } from 'zss/memory/bookoperations'
import { memoryensuresoftwarecodepage } from 'zss/memory/books'
import { memoryreadcodepagedata } from 'zss/memory/codepageoperations'
import {
  memoryreadbookbysoftware,
  memoryreadbooklist,
} from 'zss/memory/session'
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  CODE_PAGE_TYPE,
  MEMORY_LABEL,
} from 'zss/memory/types'
import { READ_CONTEXT } from 'zss/words/reader'
import { NAME } from 'zss/words/types'

import { boardcopy } from './boardcopy'

function snapshotname(target: string) {
  // memory codepage name lookups compare via NAME(); keep snapshot keys lowercased
  return NAME(`zss_snapshot_${target}`)
}

const p1 = { x: 0, y: 0 }
const p2 = { x: BOARD_WIDTH - 1, y: BOARD_HEIGHT - 1 }
const targetset = 'all'

function withmainbook<T>(fn: () => T): T {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  const prevbook = READ_CONTEXT.book
  READ_CONTEXT.book = mainbook
  try {
    return fn()
  } finally {
    READ_CONTEXT.book = prevbook
  }
}

export function boardsnapshot(target: string) {
  const targetboard = memoryreadboardbyaddress(target)
  if (!ispresent(targetboard)) {
    return
  }

  // remove existing snapshot
  const list = memoryreadbooklist()
  const name = snapshotname(targetboard.id)
  for (let i = 0; i < list.length; ++i) {
    memoryclearbookcodepage(list[i], name)
  }

  // create snapshot board codepage on MAIN (host-authoritative)
  const [snapshotcodepage] = memoryensuresoftwarecodepage(
    MEMORY_LABEL.MAIN,
    name,
    CODE_PAGE_TYPE.BOARD,
  )
  if (!ispresent(snapshotcodepage)) {
    return
  }

  const snapshotboard =
    memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(snapshotcodepage)
  if (!ispresent(snapshotboard)) {
    return
  }

  const copied = withmainbook(() =>
    boardcopy(target, snapshotboard.id, p1, p2, targetset),
  )
  if (!copied) {
    return
  }

  return snapshotboard
}

export function boardrevert(target: string) {
  const targetboard = memoryreadboardbyaddress(target)
  if (!ispresent(targetboard)) {
    return
  }

  // read snapshot
  const name = snapshotname(targetboard.id)
  const snapshotboard = memoryreadboardbyaddress(name)
  if (!ispresent(snapshotboard)) {
    return
  }

  const copied = withmainbook(() =>
    boardcopy(snapshotboard.id, target, p1, p2, targetset),
  )
  if (!copied) {
    return
  }

  return snapshotboard
}
