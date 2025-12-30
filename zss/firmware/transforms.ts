import { degToRad } from 'maath/misc'
import { boardcopy } from 'zss/feature/boardcopy'
import { boardpivot } from 'zss/feature/boardpivot'
import { boardremix } from 'zss/feature/boardremix'
import { boardrevert, boardsnapshot } from 'zss/feature/boardsnapshot'
import { boardweave } from 'zss/feature/boardweave'
import { createfirmware } from 'zss/firmware'
import { pick } from 'zss/mapping/array'
import { MAYBE, isnumber, ispresent, isstring } from 'zss/mapping/types'
import { memoryreadbooklist } from 'zss/memory'
import { bookreadcodepagesbytypeandstat } from 'zss/memory/bookoperations'
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  CODE_PAGE,
  CODE_PAGE_TYPE,
} from 'zss/memory/types'
import { ARG_TYPE, READ_CONTEXT, readargs } from 'zss/words/reader'
import { NAME, PT, WORD } from 'zss/words/types'

function readfilter(words: WORD[], index: number) {
  let targetset = 'all'
  const pt1: PT = { x: 0, y: 0 }
  const pt2: PT = { x: BOARD_WIDTH - 1, y: BOARD_HEIGHT - 1 }
  for (let i = index; i < words.length; ) {
    const [checkarg, ii] = readargs(words, i, [ARG_TYPE.MAYBE_NUMBER_OR_STRING])
    if (isstring(checkarg)) {
      targetset = NAME(checkarg)
      // parse next set
      i = ii
    } else if (isnumber(checkarg)) {
      const [y1, x2, y2, iii] = readargs(words, ii, [
        ARG_TYPE.NUMBER,
        ARG_TYPE.MAYBE_NUMBER,
        ARG_TYPE.MAYBE_NUMBER,
      ])
      pt1.x = Math.min(checkarg, x2 ?? checkarg)
      pt1.y = Math.min(y1, y2 ?? y1)
      pt2.x = Math.max(checkarg, x2 ?? checkarg)
      pt2.y = Math.max(y1, y2 ?? y1)
      // parse next set
      i = iii
    } else {
      break
    }
  }
  return { targetset, pt1, pt2 }
}

function pickcodepagewithtype(
  type: CODE_PAGE_TYPE,
  address: string,
): MAYBE<CODE_PAGE> {
  const books = memoryreadbooklist()
  for (let i = 0; i < books.length; ++i) {
    const book = books[i]
    const fallbackcodepage = pick(
      bookreadcodepagesbytypeandstat(book, type, address),
    )
    if (ispresent(fallbackcodepage)) {
      return fallbackcodepage
    }
  }
  return undefined
}

export const TRANSFORM_FIRMWARE = createfirmware()
  .command('snapshot', () => {
    if (!ispresent(READ_CONTEXT.book) || !ispresent(READ_CONTEXT.board)) {
      return 0
    }
    boardsnapshot(READ_CONTEXT.board.id)
    return 0
  })
  .command('revert', () => {
    if (!ispresent(READ_CONTEXT.book) || !ispresent(READ_CONTEXT.board)) {
      return 0
    }
    boardrevert(READ_CONTEXT.board.id)
    return 0
  })
  .command('copy', (_, words) => {
    if (!ispresent(READ_CONTEXT.book) || !ispresent(READ_CONTEXT.board)) {
      return 0
    }
    const [stat, ii] = readargs(words, 0, [ARG_TYPE.STRING])
    const sourceboard = pickcodepagewithtype(CODE_PAGE_TYPE.BOARD, stat)
    if (ispresent(sourceboard)) {
      const filter = readfilter(words, ii)
      boardcopy(
        sourceboard.id,
        READ_CONTEXT.board.id,
        filter.pt1,
        filter.pt2,
        filter.targetset,
      )
    }
    return 0
  })
  .command('remix', (_, words) => {
    if (!ispresent(READ_CONTEXT.book) || !ispresent(READ_CONTEXT.board)) {
      return 0
    }
    const [stat, pattersize, mirror, ii] = readargs(words, 0, [
      ARG_TYPE.STRING,
      ARG_TYPE.NUMBER,
      ARG_TYPE.NUMBER,
    ])
    const sourceboard = pickcodepagewithtype(CODE_PAGE_TYPE.BOARD, stat)
    if (ispresent(sourceboard)) {
      const filter = readfilter(words, ii)
      boardremix(
        READ_CONTEXT.board.id,
        sourceboard.id,
        pattersize,
        mirror,
        filter.pt1,
        filter.pt2,
        filter.targetset,
      )
    }
    return 0
  })
  .command('weave', (_, words) => {
    if (!ispresent(READ_CONTEXT.book) || !ispresent(READ_CONTEXT.board)) {
      return 0
    }
    const [dir, ii] = readargs(words, 0, [ARG_TYPE.DIR])
    const delta = {
      x: dir.destpt.x - (READ_CONTEXT.element?.x ?? 0),
      y: dir.destpt.y - (READ_CONTEXT.element?.y ?? 0),
    }

    const filter = readfilter(words, ii)
    boardweave(
      READ_CONTEXT.board.id,
      delta,
      filter.pt1,
      filter.pt2,
      READ_CONTEXT.elementid,
      filter.targetset,
    )
    return 0
  })
  .command('pivot', (_, words) => {
    if (!ispresent(READ_CONTEXT.book) || !ispresent(READ_CONTEXT.board)) {
      return 0
    }
    const [degrees, ii] = readargs(words, 0, [ARG_TYPE.NUMBER])
    const filter = readfilter(words, ii)
    boardpivot(
      READ_CONTEXT.board.id,
      degToRad(degrees),
      filter.pt1,
      filter.pt2,
      filter.targetset,
    )
    return 0
  })
