// @ts-expect-error wow amazing
import wfc from 'wavefunctioncollapse'
import { pick } from 'zss/mapping/array'
import { isnumber, ispresent } from 'zss/mapping/types'
import {
  memoryboardinit,
  memoryelementkindread,
  memoryelementstatread,
  memorywritefromkind,
} from 'zss/memory'
import { listnamedelements } from 'zss/memory/atomics'
import {
  boardelementread,
  boardgetterrain,
  boardsafedelete,
  boardsetterrain,
} from 'zss/memory/board'
import { boardelementisobject } from 'zss/memory/boardelement'
import { bookreadcodepagewithtype } from 'zss/memory/book'
import { codepagereaddata } from 'zss/memory/codepage'
import {
  BOARD_HEIGHT,
  BOARD_SIZE,
  BOARD_WIDTH,
  CODE_PAGE_TYPE,
} from 'zss/memory/types'
import { READ_CONTEXT } from 'zss/words/reader'
import { NAME, PT } from 'zss/words/types'

import { mapelementcopy } from './boardcopy'

const MAX_ATTEMPT = 5
export function boardremix(
  target: string,
  source: string,
  patternsize: number,
  mirror: number,
  p1: PT,
  p2: PT,
  targetset: string,
): boolean {
  if (!ispresent(READ_CONTEXT.book)) {
    return false
  }
  const book = READ_CONTEXT.book

  const targetcodepage = bookreadcodepagewithtype(
    book,
    CODE_PAGE_TYPE.BOARD,
    target,
  )
  const sourcecodepage = bookreadcodepagewithtype(
    book,
    CODE_PAGE_TYPE.BOARD,
    source,
  )
  const targetboard = codepagereaddata<CODE_PAGE_TYPE.BOARD>(targetcodepage)
  const sourceboard = codepagereaddata<CODE_PAGE_TYPE.BOARD>(sourcecodepage)
  if (!ispresent(targetboard) || !ispresent(sourceboard)) {
    return false
  }

  // make sure lookup is created
  memoryboardinit(targetboard)
  memoryboardinit(sourceboard)

  // element map
  let akind = 0 // kind
  const elementkindtoalphamap = new Map<string, number>()
  const elementalphatokindmap = new Map<number, string>()

  // scan board into image
  let p = 0
  const NO_COLOR = 32
  const data = new Uint8Array(BOARD_SIZE * 4)
  for (let y = 0; y < BOARD_HEIGHT; ++y) {
    for (let x = 0; x < BOARD_WIDTH; ++x) {
      const el = boardelementread(sourceboard, { x, y })
      const r = el?.char ?? 0 // in this case we have to ignore 0
      const g = el?.color ?? NO_COLOR // onclear here means unset
      const b = el?.bg ?? NO_COLOR // onclear here means unset
      // r, g, b - char, color, bg
      data[p++] = r
      data[p++] = g
      data[p++] = b

      // alpha
      const kind = memoryelementkindread(el)
      const kindname = NAME(kind?.name ?? 'empty')
      const maybealpha = elementkindtoalphamap.get(kindname)
      if (isnumber(maybealpha)) {
        data[p++] = maybealpha
      } else {
        // add it & bump akind
        elementkindtoalphamap.set(kindname, akind)
        elementalphatokindmap.set(akind, kindname)
        data[p++] = akind++
      }
    }
  }

  const genwidth = p2.x - p1.x + 1
  const genheight = p2.y - p1.y + 1

  // generate new image
  const model = new wfc.OverlappingModel(
    data,
    BOARD_WIDTH,
    BOARD_HEIGHT,
    patternsize, // pattern size
    genwidth,
    genheight,
    false, // is the input wrapping ?
    false, // is the output wrapping ?
    mirror, // can we mirror the output 1 - 8
    0,
  )

  let attempt = 0
  for (; attempt < MAX_ATTEMPT; ++attempt) {
    if (model.generate()) {
      break
    }
  }
  if (attempt === MAX_ATTEMPT) {
    return false
  }

  // unpack bytes onto targetboard
  p = 0
  const remixdata: Uint8Array = model.graphics()
  for (let y = p1.y; y <= p2.y; ++y) {
    for (let x = p1.x; x <= p2.x; ++x) {
      const dpt: PT = { x, y }
      const dchar = remixdata[p++]
      const dcolor = remixdata[p++]
      const dbg = remixdata[p++]
      akind = remixdata[p++]

      // blank target region
      switch (targetset) {
        case 'all': {
          const maybeobject = boardelementread(targetboard, { x, y })
          if (boardelementisobject(maybeobject)) {
            boardsafedelete(targetboard, maybeobject, book.timestamp)
          }
          boardsetterrain(targetboard, { x, y })
          break
        }
        case 'object': {
          const maybeobject = boardelementread(targetboard, { x, y })
          if (boardelementisobject(maybeobject)) {
            boardsafedelete(targetboard, maybeobject, book.timestamp)
          }
          break
        }
        case 'terrain':
          boardsetterrain(targetboard, { x, y })
          break
        default:
          break
      }

      // create new element
      let maybekind = elementalphatokindmap.get(akind) ?? ''
      const sourceelement = memoryelementkindread({ kind: maybekind })
      switch (targetset) {
        case 'all':
          break
        case 'object':
          if (!boardelementisobject(sourceelement)) {
            maybekind = ''
          }
          break
        case 'terrain':
          if (boardelementisobject(sourceelement)) {
            maybekind = ''
          }
          break
        default:
          if (memoryelementstatread(sourceelement, 'group') !== targetset) {
            maybekind = ''
          }
          if (maybekind) {
            // blank target region
            const maybeobject = boardelementread(targetboard, { x, y })
            if (boardelementisobject(maybeobject)) {
              boardsafedelete(targetboard, maybeobject, book.timestamp)
            }
            boardsetterrain(targetboard, { x, y })
          }
          break
      }

      const maybenew = maybekind
        ? memorywritefromkind(targetboard, [maybekind], dpt)
        : undefined

      // skip if we didn't create
      if (!ispresent(maybenew) || !ispresent(sourceelement)) {
        continue
      }

      // map useful stats
      mapelementcopy(maybenew, sourceelement)

      // apply display
      if (dchar > 0) {
        maybenew.char = dchar
      }
      if (dcolor < NO_COLOR) {
        maybenew.color = dcolor
      }
      if (dbg < NO_COLOR) {
        maybenew.bg = dbg
      }

      // sample if element category is object
      if (boardelementisobject(maybenew)) {
        // sample t board example of 'kind'
        const sample = pick(listnamedelements(sourceboard, maybekind))
        if (ispresent(sample)) {
          // copy terrain element from under sample
          boardsetterrain(targetboard, {
            ...boardgetterrain(sourceboard, sample.x ?? 0, sample.y ?? 0),
            x,
            y,
          })
          // copy __some__ of the stats
          mapelementcopy(maybenew, sample)
        }
      }
    }
  }

  return true
}
