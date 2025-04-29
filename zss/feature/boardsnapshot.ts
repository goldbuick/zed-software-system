import { ispresent } from 'zss/mapping/types'
import { MEMORY_LABEL, memoryensuresoftwarecodepage } from 'zss/memory'
import { bookclearcodepage, bookreadcodepagewithtype } from 'zss/memory/book'
import { codepagereaddata } from 'zss/memory/codepage'
import { CODE_PAGE_TYPE } from 'zss/memory/types'
import { READ_CONTEXT } from 'zss/words/reader'
import { PT } from 'zss/words/types'

import { boardcopy } from './boardcopy'

function snapshotname(target: string) {
  return `zss_snapshot_${target}`
}

export function boardsnapshot(
  target: string,
  p1: PT,
  p2: PT,
  targetset: string,
) {
  const targetcodepage = bookreadcodepagewithtype(
    READ_CONTEXT.book,
    CODE_PAGE_TYPE.BOARD,
    target,
  )
  const targetboard = codepagereaddata<CODE_PAGE_TYPE.BOARD>(targetcodepage)
  if (!ispresent(targetboard)) {
    return
  }
  const name = snapshotname(targetboard.id)

  // remove existing snapshot
  bookclearcodepage(READ_CONTEXT.book, name)

  // create snapshot board codepage
  const snapshotcodepage = memoryensuresoftwarecodepage(
    MEMORY_LABEL.CONTENT,
    name,
    CODE_PAGE_TYPE.BOARD,
  )

  // create stub board data
  const snapshotboard = codepagereaddata<CODE_PAGE_TYPE.BOARD>(snapshotcodepage)
  if (!ispresent(snapshotboard)) {
    return
  }

  // invoke copy
  boardcopy(target, snapshotboard.id, p1, p2, targetset)

  // return board
  return snapshotboard
}

export function boardrevert(target: string, p1: PT, p2: PT, targetset: string) {
  const targetcodepage = bookreadcodepagewithtype(
    READ_CONTEXT.book,
    CODE_PAGE_TYPE.BOARD,
    target,
  )
  const targetboard = codepagereaddata<CODE_PAGE_TYPE.BOARD>(targetcodepage)
  if (!ispresent(targetboard)) {
    return
  }
  const name = snapshotname(targetboard.id)

  // read snapshot
  const snapshotcodepage = bookreadcodepagewithtype(
    READ_CONTEXT.book,
    CODE_PAGE_TYPE.BOARD,
    name,
  )
  const snapshotboard = codepagereaddata<CODE_PAGE_TYPE.BOARD>(snapshotcodepage)
  if (!ispresent(snapshotboard)) {
    return
  }

  // invoke copy
  boardcopy(snapshotboard.id, target, p1, p2, targetset)

  // return board
  return snapshotboard
}
