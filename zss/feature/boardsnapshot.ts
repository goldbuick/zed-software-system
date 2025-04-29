import { objectKeys } from 'ts-extras'
import { deepcopy, ispresent } from 'zss/mapping/types'
import { MEMORY_LABEL, memoryensuresoftwarecodepage } from 'zss/memory'
import { boardelementname } from 'zss/memory/boardelement'
import { bookclearcodepage, bookreadcodepagewithtype } from 'zss/memory/book'
import { codepagereaddata } from 'zss/memory/codepage'
import { BOARD_ELEMENT, CODE_PAGE_TYPE } from 'zss/memory/types'
import { READ_CONTEXT } from 'zss/words/reader'
import { PT } from 'zss/words/types'

function snapshotname(target: string) {
  return `zss_snapshot_${target}`
}

function noplayer(
  objects: Record<string, BOARD_ELEMENT>,
): Record<string, BOARD_ELEMENT> {
  const ids = objectKeys(objects)
  for (let i = 0; i < ids.length; ++i) {
    const element = objects[ids[i]]
    if (boardelementname(element) === 'player') {
      delete objects[ids[i]]
    }
  }
  return objects
}

function onlyplayers(
  objects: Record<string, BOARD_ELEMENT>,
): Record<string, BOARD_ELEMENT> {
  const ids = objectKeys(objects)
  for (let i = 0; i < ids.length; ++i) {
    const element = objects[ids[i]]
    if (boardelementname(element) !== 'player') {
      delete objects[ids[i]]
    }
  }
  return objects
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

  // copy over terrain & objects
  snapshotboard.terrain = deepcopy(targetboard.terrain)
  snapshotboard.objects = noplayer(deepcopy(targetboard.objects))
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

  // copy over terrain & objects
  targetboard.terrain = deepcopy(snapshotboard.terrain)

  // create merged list
  targetboard.objects = {
    // snapshot'd objects
    ...noplayer(deepcopy(snapshotboard.objects)),
    // players don't get messed with
    ...onlyplayers(deepcopy(targetboard.objects)),
  }
}
