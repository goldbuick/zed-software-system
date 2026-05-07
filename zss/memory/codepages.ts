/**
 * Codepage listing and pick-by-stat. Uses session, bookoperations, codepageoperations.
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

import {
  memorylistcodepagebytype,
  memorylistcodepagebytypeandstat,
  memorylistcodepagessorted,
  memoryreadbookflags,
  memoryreadcodepage,
} from './bookoperations'
import {
  memoryreadcodepagestat,
  memoryreadcodepagetype,
} from './codepageoperations'
import { memoryreadbookbysoftware, memoryreadbooklist } from './session'
import { CODE_PAGE, CODE_PAGE_TYPE, MEMORY_LABEL } from './types'

const TRACKING_IDS_KEY = 'ids'

export function memorylistallcodepagewithtype<T extends CODE_PAGE_TYPE>(
  type: T,
): CODE_PAGE[] {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  const matchedpages: Record<string, CODE_PAGE> = {}
  const mainpages = memorylistcodepagebytype(mainbook, type)
  for (const page of mainpages) {
    matchedpages[page.id] = page
  }
  const books = memoryreadbooklist()
  for (let i = 0; i < books.length; ++i) {
    const book = books[i]
    if (book.id !== mainbook?.id) {
      const pages = memorylistcodepagebytype(book, type)
      for (const page of pages) {
        matchedpages[page.id] = page
      }
    }
  }
  return Object.values(matchedpages)
}

export function memoryreadcodepagebyid(address: string): MAYBE<CODE_PAGE> {
  const books = memoryreadbooklist()
  for (let i = 0; i < books.length; ++i) {
    const maybecodedpage = memoryreadcodepage(books[i], address)
    if (ispresent(maybecodedpage)) {
      return maybecodedpage
    }
  }
  return undefined
}

export function memorypickcodepagewithtypeandstat<T extends CODE_PAGE_TYPE>(
  type: T,
  address: string,
): MAYBE<CODE_PAGE> {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  const matchedpages: Record<string, CODE_PAGE> = {}
  const pages = memorylistcodepagebytypeandstat(mainbook, type, address)
  for (const page of pages) {
    matchedpages[page.id] = page
  }
  const books = memoryreadbooklist()
  for (let i = 0; i < books.length; ++i) {
    const book = books[i]
    if (book.id !== mainbook?.id) {
      const otherpages = memorylistcodepagebytypeandstat(book, type, address)
      for (const page of otherpages) {
        matchedpages[page.id] = page
      }
    }
  }
  const allpages = Object.values(matchedpages)
  if (allpages.length <= 1) {
    return allpages[0]
  }
  let pickmode: 'shuffle' | 'inorder' | '' = ''
  const weights: Record<string, number> = {}
  for (const page of Object.values(matchedpages)) {
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
  const trackingflags = memoryreadbookflags(mainbook, createtrackingid(address))
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

export function memorylistcodepagewithtype<T extends CODE_PAGE_TYPE>(
  type: T,
): CODE_PAGE[] {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  const found = memorylistcodepagessorted(mainbook).filter(
    (codepage) => memoryreadcodepagetype(codepage) === type,
  )
  const books = memoryreadbooklist()
  for (let i = 0; i < books.length; ++i) {
    const book = books[i]
    if (book.id !== mainbook?.id) {
      found.push(
        ...memorylistcodepagessorted(book).filter(
          (codepage) => memoryreadcodepagetype(codepage) === type,
        ),
      )
    }
  }
  return found
}
