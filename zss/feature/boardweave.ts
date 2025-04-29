import { ispresent } from 'zss/mapping/types'
import { boardelementread, createboard } from 'zss/memory/board'
import { boardelementisobject } from 'zss/memory/boardelement'
import { bookreadcodepagewithtype } from 'zss/memory/book'
import { bookboardsetlookup } from 'zss/memory/bookboard'
import { codepagereaddata } from 'zss/memory/codepage'
import { BOARD_HEIGHT, BOARD_WIDTH, CODE_PAGE_TYPE } from 'zss/memory/types'
import { READ_CONTEXT } from 'zss/words/reader'
import { PT } from 'zss/words/types'

export function boardweave(
  target: string,
  delta: PT,
  p1: PT,
  p2: PT,
  targetset: string,
) {
  if (!ispresent(READ_CONTEXT.book)) {
    return
  }
  const book = READ_CONTEXT.book

  const targetcodepage = bookreadcodepagewithtype(
    book,
    CODE_PAGE_TYPE.BOARD,
    target,
  )
  const targetboard = codepagereaddata<CODE_PAGE_TYPE.BOARD>(targetcodepage)
  if (!ispresent(targetboard)) {
    return
  }

  // create tmp board for terrain
  const tmpboard = createboard()

  // make sure lookup is created
  bookboardsetlookup(book, targetboard)

  // apply weave
  for (let y = p1.y; y <= p2.y; ++y) {
    for (let x = p1.x; x <= p2.x; ++x) {
      let weaveobject = false
      let weaveterrain = false
      switch (targetset) {
        case 'all':
          weaveobject = true
          weaveterrain = true
          break
        case 'object':
          weaveobject = true
          break
        case 'terrain':
          weaveterrain = true
          break
        default:
          // todo: handle groups
          break
      }
      const tx = (x + delta.x + BOARD_WIDTH) % BOARD_WIDTH
      const ty = (y + delta.y + BOARD_HEIGHT) % BOARD_HEIGHT
      if (weaveobject) {
        const maybeobject = boardelementread(targetboard, { x, y })
        if (
          boardelementisobject(maybeobject) &&
          ispresent(maybeobject?.x) &&
          ispresent(maybeobject?.y)
        ) {
          maybeobject.x = tx
          maybeobject.lx = tx
          maybeobject.y = ty
          maybeobject.ly = ty
        }
      }
      if (weaveterrain) {
        tmpboard.terrain[tx + ty * BOARD_WIDTH] =
          targetboard.terrain[x + y * BOARD_WIDTH]
      }
    }
  }

  // replace terrain array
  if (targetset === 'all' || targetset === 'terrain') {
    targetboard.terrain = [...tmpboard.terrain]
  }

  // reset all lookups
  delete targetboard.named
  delete targetboard.lookup

  // make sure lookup is created
  bookboardsetlookup(book, targetboard)
}
