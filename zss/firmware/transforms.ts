import { boardcopy } from 'zss/feature/boardcopy'
import { boardpivot } from 'zss/feature/boardpivot'
import {
  type PIVOTDISCRETIZATION,
  pivotdiscfromkeyword,
} from 'zss/feature/boardpivotmath'
import { boardremix } from 'zss/feature/boardremix'
import { boardrevert, boardsnapshot } from 'zss/feature/boardsnapshot'
import { boardweave } from 'zss/feature/boardweave'
import { createfirmware } from 'zss/firmware'
import { PIVOT_SHEAR_KEYWORDS } from 'zss/firmware/autocompleteconstants'
import { MAYBE, ispresent, isstring } from 'zss/mapping/types'
import { memoryreadboardbyevaldir } from 'zss/memory/boards'
import { memorypickcodepage } from 'zss/memory/codepages'
import { memoryreadbooklist } from 'zss/memory/session'
import { CODE_PAGE_TYPE } from 'zss/memory/types'
import { isstrcolor } from 'zss/words/color'
import { isstrdir } from 'zss/words/dir'
import { isstrgroup, readgroup, readstrgroupname } from 'zss/words/group'
import { READ_CONTEXT, readargs } from 'zss/words/reader'
import {
  fullboardrect,
  parserectfromnumbers,
  parserectoneword,
} from 'zss/words/rect'
import { ARG_TYPE, NAME, PT, WORD } from 'zss/words/types'

type ReadFilterResult = {
  targetset: string
  pt1: PT
  pt2: PT
  dest: MAYBE<PT>
}

function readfilter(words: WORD[], index: number): ReadFilterResult {
  let targetset = 'all'
  let dest: MAYBE<PT> = undefined
  const full = fullboardrect()
  const pt1: PT = { x: full.pt1.x, y: full.pt1.y }
  const pt2: PT = { x: full.pt2.x, y: full.pt2.y }
  for (let i = index; i < words.length; ) {
    const onewordrect = parserectoneword(words[i])
    if (ispresent(onewordrect)) {
      pt1.x = onewordrect.pt1.x
      pt1.y = onewordrect.pt1.y
      pt2.x = onewordrect.pt2.x
      pt2.y = onewordrect.pt2.y
      i += 1
      continue
    }
    const fromnums = parserectfromnumbers(words, i)
    if (ispresent(fromnums)) {
      pt1.x = fromnums.rect.pt1.x
      pt1.y = fromnums.rect.pt1.y
      pt2.x = fromnums.rect.pt2.x
      pt2.y = fromnums.rect.pt2.y
      i = fromnums.next
      continue
    }
    const [checkarg, ii] = readargs(words, i, [ARG_TYPE.ANY])
    if (isstrdir(checkarg)) {
      const [destdir, iii] = readargs(words, i, [ARG_TYPE.DIR])
      // use resolve pt for dest
      dest = destdir.destpt
      // parse next set
      i = iii
    } else if (isstring(checkarg) || isstrcolor(checkarg)) {
      if (isstring(checkarg)) {
        const builtin = NAME(checkarg)
        if (
          builtin === 'all' ||
          builtin === 'terrain' ||
          builtin === 'object' ||
          builtin === 'self' ||
          builtin === 'others'
        ) {
          targetset = builtin
          i = ii
          continue
        }
      }
      const prevwords = READ_CONTEXT.words
      READ_CONTEXT.words = words
      const [group, gii] = readgroup(i)
      READ_CONTEXT.words = prevwords
      if (isstrgroup(group)) {
        targetset = NAME(readstrgroupname(group) ?? '')
        i = gii
      } else if (isstring(checkarg)) {
        targetset = NAME(checkarg)
        i = ii
      } else {
        break
      }
    } else {
      break
    }
  }
  return { targetset, pt1, pt2, dest }
}

/** Parses optional targetset and region after command-specific args (exported for tests). */
export function readtransformfilter(words: WORD[], index: number) {
  return readfilter(words, index)
}

/** After the degrees arg: optional shear keyword (`pivotdiscfromkeyword`); exported for tests. */
export function readpivotsheardiscandfilterstart(
  words: WORD[],
  indexafterdegrees: number,
): { disc: PIVOTDISCRETIZATION | undefined; filterstart: number } {
  const next = words[indexafterdegrees]
  if (ispresent(next) && isstring(next)) {
    const parsed = pivotdiscfromkeyword(NAME(next))
    if (ispresent(parsed)) {
      return { disc: parsed, filterstart: indexafterdegrees + 1 }
    }
  }
  return { disc: undefined, filterstart: indexafterdegrees }
}

export const TRANSFORM_FIRMWARE = createfirmware()
  .command('snapshot', ['board snapshot'], (chip) => {
    if (!ispresent(READ_CONTEXT.book) || !ispresent(READ_CONTEXT.board)) {
      return 0
    }
    chip.set('didfail', ispresent(boardsnapshot(READ_CONTEXT.board.id)) ? 0 : 1)
    return 0
  })
  .command('revert', ['board to snapshot state'], (chip) => {
    if (!ispresent(READ_CONTEXT.book) || !ispresent(READ_CONTEXT.board)) {
      return 0
    }
    chip.set('didfail', ispresent(boardrevert(READ_CONTEXT.board.id)) ? 0 : 1)
    return 0
  })
  .command(
    'copy',
    [ARG_TYPE.STRING, 'region from source to current board'],
    (chip, words) => {
      if (!ispresent(READ_CONTEXT.book) || !ispresent(READ_CONTEXT.board)) {
        chip.set('didfail', 1)
        return 0
      }
      const [stat, ii] = readargs(words, 0, [ARG_TYPE.STRING])
      const sourceboard = memorypickcodepage(
        memoryreadbooklist(),
        CODE_PAGE_TYPE.BOARD,
        stat,
      )
      if (!ispresent(sourceboard)) {
        chip.set('didfail', 1)
        return 0
      }
      const filter = readfilter(words, ii)
      chip.set(
        'didfail',
        boardcopy(
          sourceboard.id,
          READ_CONTEXT.board.id,
          filter.pt1,
          filter.pt2,
          filter.targetset,
          filter.dest,
          READ_CONTEXT.elementid,
        )
          ? 0
          : 1,
      )
      return 0
    },
  )
  .command(
    'remix',
    [
      ARG_TYPE.STRING,
      ARG_TYPE.NUMBER,
      ARG_TYPE.NUMBER,
      'from source with pattern size and mirror to current board',
    ],
    (chip, words) => {
      if (!ispresent(READ_CONTEXT.book) || !ispresent(READ_CONTEXT.board)) {
        chip.set('didfail', 1)
        return 0
      }
      const [stat, pattersize, mirror, ii] = readargs(words, 0, [
        ARG_TYPE.STRING,
        ARG_TYPE.NUMBER,
        ARG_TYPE.NUMBER,
      ])
      const sourceboard = memorypickcodepage(
        memoryreadbooklist(),
        CODE_PAGE_TYPE.BOARD,
        stat,
      )
      if (!ispresent(sourceboard)) {
        chip.set('didfail', 1)
        return 0
      }
      const filter = readfilter(words, ii)
      chip.set(
        'didfail',
        boardremix(
          READ_CONTEXT.board.id,
          sourceboard.id,
          pattersize,
          mirror,
          filter.pt1,
          filter.pt2,
          filter.targetset,
          READ_CONTEXT.elementid,
        )
          ? 0
          : 1,
      )
      return 0
    },
  )
  .command(
    'weave',
    [ARG_TYPE.DIR, 'board elements in direction'],
    (chip, words) => {
      if (!ispresent(READ_CONTEXT.book) || !ispresent(READ_CONTEXT.board)) {
        chip.set('didfail', 1)
        return 0
      }
      const [dir, ii] = readargs(words, 0, [ARG_TYPE.DIR])
      const delta = {
        x: dir.destpt.x - (READ_CONTEXT.element?.x ?? 0),
        y: dir.destpt.y - (READ_CONTEXT.element?.y ?? 0),
      }

      const board = memoryreadboardbyevaldir(dir, READ_CONTEXT.board)
      const filter = readfilter(words, ii)
      chip.set(
        'didfail',
        boardweave(
          board?.id ?? '',
          delta,
          filter.pt1,
          filter.pt2,
          READ_CONTEXT.elementid,
          filter.targetset,
        )
          ? 0
          : 1,
      )
      return 0
    },
  )
  .command(
    'pivot',
    [
      ARG_TYPE.NUMBER,
      'board elements by degrees; optional shear keyword (taper_floor, taper_ceil, taper_trunc, mishin_floor, mishin_ceil, shear_soft, shear_hard) then region / targetset',
    ],
    (chip, words) => {
      if (!ispresent(READ_CONTEXT.book) || !ispresent(READ_CONTEXT.board)) {
        chip.set('didfail', 1)
        return 0
      }
      const [degrees, ii] = readargs(words, 0, [ARG_TYPE.NUMBER])
      const { disc, filterstart } = readpivotsheardiscandfilterstart(words, ii)
      const filter = readfilter(words, filterstart)
      chip.set(
        'didfail',
        boardpivot(
          READ_CONTEXT.board.id,
          (degrees * Math.PI) / 180,
          filter.pt1,
          filter.pt2,
          READ_CONTEXT.elementid,
          filter.targetset,
          disc,
        )
          ? 0
          : 1,
      )
      return 0
    },
    { byposition: [[], [...PIVOT_SHEAR_KEYWORDS]] },
  )
