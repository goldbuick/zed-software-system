import { linepoints } from 'zss/mapping/2d'
import { ispresent, MAYBE } from 'zss/mapping/types'
import { boardobjectread, createboard } from 'zss/memory/board'
import { bookreadcodepagewithtype } from 'zss/memory/book'
import { bookboardsetlookup } from 'zss/memory/bookboard'
import { codepagereaddata } from 'zss/memory/codepage'
import {
  BOARD,
  BOARD_HEIGHT,
  BOARD_WIDTH,
  CODE_PAGE_TYPE,
} from 'zss/memory/types'
import { READ_CONTEXT } from 'zss/words/reader'

export function boardpivot(
  target: string,
  theta: number,
  pivotterrain: boolean,
  pivotobject: boolean,
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

  // create tmp board for terrain
  let tmpboard: MAYBE<BOARD>

  // make sure lookup is created
  bookboardsetlookup(READ_CONTEXT.book, targetboard)
  bookboardsetlookup(READ_CONTEXT.book, tmpboard)

  const alpha = -Math.tan(theta * 0.5)
  const beta = Math.sin(theta)

  // x shear
  const xshear = Math.round(BOARD_WIDTH * alpha)
  const xedge = linepoints(xshear, 0, -xshear, BOARD_HEIGHT - 1)

  // y shear
  const yshear = Math.round(BOARD_HEIGHT * beta)
  const yedge = linepoints(0, yshear, BOARD_WIDTH - 1, -yshear)

  // apply shears
  const transformset = [xedge, yedge, xedge]

  for (let i = 0; i < transformset.length; ++i) {
    const edge = transformset[i]

    // y shear
    if (edge.length === BOARD_WIDTH) {
      // create tmpboard
      tmpboard = createboard()
      for (let x = 0; x < BOARD_WIDTH; ++x) {
        const skew = edge[x].y
        for (let y = 0; y < BOARD_HEIGHT; ++y) {
          const yskew = (y + skew + BOARD_HEIGHT) % BOARD_HEIGHT
          tmpboard.terrain[x + yskew * BOARD_WIDTH] =
            targetboard.terrain[x + y * BOARD_WIDTH]
        }
      }
      // replace terrain array
      if (pivotterrain) {
        targetboard.terrain = tmpboard.terrain
      }
    }

    // x shear
    if (edge.length === BOARD_HEIGHT) {
      // create tmpboard
      tmpboard = createboard()
      for (let y = 0; y < BOARD_HEIGHT; ++y) {
        const skew = edge[y].x
        const row = y * BOARD_WIDTH
        for (let x = 0; x < BOARD_WIDTH; x++) {
          const xskew = (x + skew + BOARD_WIDTH) % BOARD_WIDTH
          tmpboard.terrain[xskew + row] = targetboard.terrain[x + row]
        }
      }
      // replace terrain array
      if (pivotterrain) {
        targetboard.terrain = tmpboard.terrain
      }
    }
  }

  // reset all lookups
  delete targetboard.named
  delete targetboard.lookup

  // rebuild lookups
  bookboardsetlookup(READ_CONTEXT.book, targetboard)
}
