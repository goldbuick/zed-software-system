import { ispresent } from 'zss/mapping/types'
import {
  memoryreadgroup,
  memorysafedeleteelement,
} from 'zss/memory/boardlifecycle'
import {
  memoryinitboard,
  memoryreadboardbyaddress,
} from 'zss/memory/boards'
import { BOARD_ELEMENT } from 'zss/memory/types'
import { READ_CONTEXT } from 'zss/words/reader'
import { PT } from 'zss/words/types'

function withinregion(el: BOARD_ELEMENT, p1: PT, p2: PT) {
  const x = el.x ?? 0
  const y = el.y ?? 0
  return x >= p1.x && x <= p2.x && y >= p1.y && y <= p2.y
}

export function boarderase(
  target: string,
  p1: PT,
  p2: PT,
  self: string,
  targetset: string,
): boolean {
  if (!ispresent(READ_CONTEXT.book)) {
    return false
  }
  const book = READ_CONTEXT.book
  const targetboard = memoryreadboardbyaddress(target)
  if (!ispresent(targetboard)) {
    return false
  }

  memoryinitboard(targetboard)

  const { terrainelements, objectelements } = memoryreadgroup(
    targetboard,
    self,
    targetset,
  )

  let erased = false
  for (let i = 0; i < terrainelements.length; ++i) {
    const el = terrainelements[i]
    if (!withinregion(el, p1, p2)) {
      continue
    }
    if (memorysafedeleteelement(targetboard, el, book.timestamp)) {
      erased = true
    }
  }
  for (let i = 0; i < objectelements.length; ++i) {
    const el = objectelements[i]
    if (!withinregion(el, p1, p2)) {
      continue
    }
    if (memorysafedeleteelement(targetboard, el, book.timestamp)) {
      erased = true
    }
  }

  return erased
}
