import { objectKeys } from 'ts-extras'
// @ts-expect-error wow amazing
import wfc from 'wavefunctioncollapse'
import { api_error } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { pick } from 'zss/mapping/array'
import { deepcopy, isnumber, ispresent } from 'zss/mapping/types'
import { MEMORY_LABEL, memoryensuresoftwarecodepage } from 'zss/memory'
import { listnamedelements } from 'zss/memory/atomics'
import {
  boardelementread,
  boardgetterrain,
  boardsetterrain,
} from 'zss/memory/board'
import { boardelementisobject, boardelementname } from 'zss/memory/boardelement'
import {
  bookboardsafedelete,
  bookboardsetlookup,
  bookboardwritefromkind,
  bookclearcodepage,
  bookelementkindread,
  bookreadcodepagewithtype,
} from 'zss/memory/book'
import { codepagereaddata, codepagereadname } from 'zss/memory/codepage'
import {
  BOARD_ELEMENT,
  BOARD_HEIGHT,
  BOARD_SIZE,
  BOARD_WIDTH,
  CODE_PAGE_TYPE,
} from 'zss/memory/types'
import { READ_CONTEXT } from 'zss/words/reader'
import { NAME } from 'zss/words/types'

import { write } from './writeui'

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

export function boardremixsnapshot(target: string) {
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

  // todo outcome
  write(
    SOFTWARE,
    `snapshot of ${codepagereadname(targetcodepage)} created as ${codepagereadname(snapshotcodepage)}`,
  )
}

export function boardremixrestart(target: string) {
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

const MAX_ATTEMPT = 5
export function boardremix(
  target: string,
  source: string,
  pattersize = 2,
  mirror = 1,
  p1 = { x: 0, y: 0 },
  p2 = { x: BOARD_WIDTH - 1, y: BOARD_HEIGHT - 1 },
) {
  const targetcodepage = bookreadcodepagewithtype(
    READ_CONTEXT.book,
    CODE_PAGE_TYPE.BOARD,
    target,
  )
  const sourcecodepage = bookreadcodepagewithtype(
    READ_CONTEXT.book,
    CODE_PAGE_TYPE.BOARD,
    source,
  )
  const targetboard = codepagereaddata<CODE_PAGE_TYPE.BOARD>(targetcodepage)
  const sourceboard = codepagereaddata<CODE_PAGE_TYPE.BOARD>(sourcecodepage)
  if (!ispresent(targetboard) || !ispresent(sourceboard)) {
    return
  }

  // make sure lookup is created
  bookboardsetlookup(READ_CONTEXT.book, targetboard)
  bookboardsetlookup(READ_CONTEXT.book, sourceboard)

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
      const kind = bookelementkindread(READ_CONTEXT.book, el)
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

  const x1 = Math.min(p1.x, p2.x)
  const y1 = Math.min(p1.y, p2.y)
  const x2 = Math.max(p1.x, p2.x)
  const y2 = Math.max(p1.y, p2.y)
  const genwidth = x2 - x1 + 1
  const genheight = y2 - y1 + 1
  //

  // generate new image
  const model = new wfc.OverlappingModel(
    data,
    BOARD_WIDTH,
    BOARD_HEIGHT,
    pattersize, // pattern size
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
    api_error(
      SOFTWARE,
      'boardremix',
      `failed to generate after ${MAX_ATTEMPT} tries`,
    )
    return
  }

  // unpack bytes onto targetboard
  p = 0
  const remixdata: Uint8Array = model.graphics()
  for (let y = y1; y <= y2; ++y) {
    for (let x = x1; x <= x2; ++x) {
      const dchar = remixdata[p++]
      const dcolor = remixdata[p++]
      const dbg = remixdata[p++]
      akind = remixdata[p++]

      // make empty
      const old = boardelementread(targetboard, { x, y })
      bookboardsafedelete(
        READ_CONTEXT.book,
        targetboard,
        old,
        READ_CONTEXT.timestamp,
      )
      boardsetterrain(targetboard, { x, y })

      // create new element
      const maybekind = elementalphatokindmap.get(akind) ?? ''
      const maybenew = bookboardwritefromkind(
        READ_CONTEXT.book,
        targetboard,
        [maybekind],
        { x, y },
      )

      // skip if we didn't create
      if (!ispresent(maybenew)) {
        continue
      }

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
          const cover = boardgetterrain(
            sourceboard,
            sample.x ?? 0,
            sample.y ?? 0,
          )
          boardsetterrain(targetboard, {
            ...cover,
            x,
            y,
          })
          // copy __some__ of the stats
          maybenew.p1 = sample.p1
          maybenew.p2 = sample.p2
          maybenew.p3 = sample.p3
          maybenew.code = sample.code
          maybenew.cycle = sample.cycle
          maybenew.light = sample.light
          maybenew.stepx = sample.stepx
          maybenew.stepy = sample.stepy
          maybenew.pushable = sample.pushable
          maybenew.collision = sample.collision
          maybenew.destructible = sample.destructible
        }
      }
    }
  }
}
