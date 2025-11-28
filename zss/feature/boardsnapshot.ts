import { ispresent } from 'zss/mapping/types'
import { memoryboardread, memoryreadbooklist } from 'zss/memory'
import { bookclearcodepage } from 'zss/memory/book'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'

import { boardcopy } from './boardcopy'

function snapshotname(target: string) {
  return `zss_snapshot_${target}`
}

const p1 = { x: 0, y: 0 }
const p2 = { x: BOARD_WIDTH - 1, y: BOARD_HEIGHT - 1 }
const targetset = 'all'

export function boardsnapshot(target: string) {
  const targetboard = memoryboardread(target)
  if (!ispresent(targetboard)) {
    return
  }

  // remove existing snapshot
  const list = memoryreadbooklist()
  const name = snapshotname(targetboard.id)
  for (let i = 0; i < list.length; ++i) {
    bookclearcodepage(list[i], name)
  }

  // create snapshot board codepage
  const snapshotboard = memoryboardread(name)
  if (!ispresent(snapshotboard)) {
    return
  }

  // invoke copy
  boardcopy(target, snapshotboard.id, p1, p2, targetset)

  // return board
  return snapshotboard
}

export function boardrevert(target: string) {
  const targetboard = memoryboardread(target)
  if (!ispresent(targetboard)) {
    return
  }

  // read snapshot
  const name = snapshotname(targetboard.id)
  const snapshotboard = memoryboardread(name)
  if (!ispresent(snapshotboard)) {
    return
  }

  // invoke copy
  boardcopy(snapshotboard.id, target, p1, p2, targetset)

  // return board
  return snapshotboard
}
