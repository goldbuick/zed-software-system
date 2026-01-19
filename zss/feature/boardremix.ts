// @ts-expect-error wow amazing
import wfc from 'wavefunctioncollapse'
import { pick } from 'zss/mapping/array'
import { isnumber, ispresent } from 'zss/mapping/types'
import {
  memoryinitboard,
  memoryreadboardbyaddress,
  memoryreadelementkind,
  memoryreadelementstat,
  memorywriteelementfromkind,
} from 'zss/memory'
import { memoryboardelementisobject } from 'zss/memory/boardelement'
import {
  memoryreadelement,
  memoryreadterrain,
  memorysafedeleteelement,
  memorywriteterrain,
} from 'zss/memory/boardoperations'
import { memorylistboardnamedelements } from 'zss/memory/spatialqueries'
import { BOARD_HEIGHT, BOARD_SIZE, BOARD_WIDTH } from 'zss/memory/types'
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

  const targetboard = memoryreadboardbyaddress(target)
  if (!ispresent(targetboard)) {
    return false
  }

  const sourceboard = memoryreadboardbyaddress(source)
  if (!ispresent(sourceboard)) {
    return false
  }

  // make sure lookup is created
  memoryinitboard(targetboard)
  memoryinitboard(sourceboard)

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
      const el = memoryreadelement(sourceboard, { x, y })
      const r = el?.char ?? 0 // in this case we have to ignore 0
      const g = el?.color ?? NO_COLOR // onclear here means unset
      const b = el?.bg ?? NO_COLOR // onclear here means unset
      let a = 0
      // map kind to alpha
      const kind = memoryreadelementkind(el)
      const kindname = NAME(kind?.name ?? 'empty')
      const maybealpha = elementkindtoalphamap.get(kindname)
      if (isnumber(maybealpha)) {
        a = maybealpha
      } else {
        // add it & bump akind
        a = akind
        elementkindtoalphamap.set(kindname, akind)
        elementalphatokindmap.set(akind, kindname)
        akind++
      }
      //
      // r, g, b - char, color, bg, kind
      data[p++] = r
      data[p++] = g
      data[p++] = b
      data[p++] = a
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
    true, // is the input wrapping ?
    false, // is the output wrapping ?
    mirror, // can we mirror the output 1 - 8
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
      const dkind = remixdata[p++]

      // blank target region
      switch (targetset) {
        case 'all': {
          const maybeobject = memoryreadelement(targetboard, { x, y })
          if (memoryboardelementisobject(maybeobject)) {
            memorysafedeleteelement(targetboard, maybeobject, book.timestamp)
          }
          memorywriteterrain(targetboard, { x, y })
          break
        }
        case 'object': {
          const maybeobject = memoryreadelement(targetboard, { x, y })
          if (memoryboardelementisobject(maybeobject)) {
            memorysafedeleteelement(targetboard, maybeobject, book.timestamp)
          }
          break
        }
        case 'terrain':
          memorywriteterrain(targetboard, { x, y })
          break
        default:
          break
      }

      // create new element
      let maybekind = elementalphatokindmap.get(dkind) ?? ''
      const sourceelement = memoryreadelementkind({ kind: maybekind })
      switch (targetset) {
        case 'all':
          break
        case 'object':
          if (!memoryboardelementisobject(sourceelement)) {
            maybekind = ''
          }
          break
        case 'terrain':
          if (memoryboardelementisobject(sourceelement)) {
            maybekind = ''
          }
          break
        default:
          if (memoryreadelementstat(sourceelement, 'group') !== targetset) {
            maybekind = ''
          }
          if (maybekind) {
            // blank target region
            const maybeobject = memoryreadelement(targetboard, { x, y })
            if (memoryboardelementisobject(maybeobject)) {
              memorysafedeleteelement(targetboard, maybeobject, book.timestamp)
            }
            memorywriteterrain(targetboard, { x, y })
          }
          break
      }

      const maybenew = maybekind
        ? memorywriteelementfromkind(targetboard, [maybekind], dpt)
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
      if (memoryboardelementisobject(maybenew)) {
        // sample t board example of 'kind'
        const sample = pick(
          memorylistboardnamedelements(sourceboard, maybekind),
        )
        if (ispresent(sample)) {
          // copy terrain element from under sample
          memorywriteterrain(targetboard, {
            ...memoryreadterrain(sourceboard, sample.x ?? 0, sample.y ?? 0),
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
