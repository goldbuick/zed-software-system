/**
 * Cross-book codepage pick-by-stat. Per-book read/list live in bookoperations.
 */
import {
  inorder,
  inorderwithweights,
  pick,
  pickwithweights,
  shuffle,
  shufflewithweights,
} from 'zss/mapping/array'
import { createtrackingid } from 'zss/mapping/guid'
import {
  MAYBE,
  isarray,
  isnumber,
  ispresent,
  isstring,
} from 'zss/mapping/types'
import { maptostring } from 'zss/mapping/value'
import { NAME } from 'zss/words/types'

import { memorylistcodepage, memoryreadflags } from './bookoperations'
import { memoryreadcodepagestat } from './codepageoperations'
import {
  memoryreadcodepagepickcache,
  memorywritecodepagepickcache,
} from './codepagepickcache'
import { memoryreadmainbook } from './session'
import { BOOK, CODE_PAGE, CODE_PAGE_TYPE } from './types'

const TRACKING_IDS_KEY = 'ids'

export function memorypickcodepage(
  books: MAYBE<BOOK> | MAYBE<BOOK>[],
  type: CODE_PAGE_TYPE,
  stat: string,
): MAYBE<CODE_PAGE> {
  const cached = memoryreadcodepagepickcache(type, stat)
  if (cached.hit) {
    return cached.page
  }
  const mainbook = memoryreadmainbook()
  const allpages = memorylistcodepage(books, { type, stat })
  const matchedpages: Record<string, CODE_PAGE> = {}
  for (let i = 0; i < allpages.length; ++i) {
    const page = allpages[i]
    matchedpages[page.id] = page
  }
  if (allpages.length <= 1) {
    // Deterministic single/miss — safe to memoize across elements of same kind.
    memorywritecodepagepickcache(type, stat, allpages[0])
    return allpages[0]
  }
  let pickmode: 'shuffle' | 'inorder' | '' = ''
  const weights: Record<string, number> = {}
  for (const page of allpages) {
    const pickstat = memoryreadcodepagestat(page, 'pick')
    if (isstring(pickstat)) {
      const [shuffleorweight, optionalweight] = pickstat.split(' ')
      switch (NAME(shuffleorweight)) {
        case 'shuffle': {
          pickmode = 'shuffle'
          const maybeweight = parseFloat(maptostring(optionalweight))
          if (isnumber(maybeweight)) {
            weights[page.id] = maybeweight
          }
          break
        }
        case 'inorder': {
          pickmode = 'inorder'
          const maybeweight = parseFloat(maptostring(optionalweight))
          if (isnumber(maybeweight)) {
            weights[page.id] = maybeweight
          }
          break
        }
        default: {
          const maybeweight = parseFloat(maptostring(shuffleorweight))
          if (isnumber(maybeweight)) {
            weights[page.id] = maybeweight
          }
          break
        }
      }
    }
  }
  const hasweights = Object.keys(weights).length > 0
  const trackingflags = memoryreadflags(mainbook, createtrackingid(stat))
  switch (pickmode) {
    case 'shuffle': {
      if (hasweights) {
        if (!ispresent(trackingflags[TRACKING_IDS_KEY])) {
          trackingflags[TRACKING_IDS_KEY] = shufflewithweights(
            allpages.map((page) => [page.id, weights[page.id] ?? 1]),
          )
        }
      } else {
        if (!ispresent(trackingflags[TRACKING_IDS_KEY])) {
          trackingflags[TRACKING_IDS_KEY] = shuffle(
            allpages.map((page) => page.id),
          )
        }
      }
      const sourceids = trackingflags[TRACKING_IDS_KEY] as string[]
      if (isarray(sourceids)) {
        const first = sourceids.shift()
        if (sourceids.length === 0) {
          delete trackingflags[TRACKING_IDS_KEY]
        }
        return matchedpages[first ?? '']
      }
      return undefined
    }
    case 'inorder': {
      if (hasweights) {
        if (!ispresent(trackingflags[TRACKING_IDS_KEY])) {
          trackingflags[TRACKING_IDS_KEY] = inorderwithweights(
            allpages.map((page) => [page.id, weights[page.id] ?? 1]),
            (a, b) =>
              (matchedpages[a]?.id ?? '').localeCompare(
                matchedpages[b]?.id ?? '',
              ),
          )
        }
      } else {
        if (!ispresent(trackingflags[TRACKING_IDS_KEY])) {
          trackingflags[TRACKING_IDS_KEY] = inorder(
            allpages.map((page) => page.id),
            (a, b) =>
              (matchedpages[a]?.id ?? '').localeCompare(
                matchedpages[b]?.id ?? '',
              ),
          )
        }
      }
      const sourceids = trackingflags[TRACKING_IDS_KEY] as string[]
      if (isarray(sourceids)) {
        const first = sourceids.shift()
        if (sourceids.length === 0) {
          delete trackingflags[TRACKING_IDS_KEY]
        }
        return matchedpages[first ?? '']
      }
      return undefined
    }
    default: {
      if (hasweights) {
        return pickwithweights(
          allpages.map((page) => [page, weights[page.id] ?? 1]),
        )
      }
      return pick(allpages)
    }
  }
}
