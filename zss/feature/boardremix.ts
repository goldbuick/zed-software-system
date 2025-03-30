import wfc from 'wavefunctioncollapse'
import { api_error } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { isnumber, ispresent } from 'zss/mapping/types'
import { boardelementread } from 'zss/memory/board'
import {
  bookboardsafedelete,
  bookboardsetlookup,
  bookboardwritefromkind,
  bookelementkindread,
  bookreadcodepagewithtype,
} from 'zss/memory/book'
import { codepagereaddata } from 'zss/memory/codepage'
import {
  BOARD_HEIGHT,
  BOARD_SIZE,
  BOARD_WIDTH,
  CODE_PAGE_TYPE,
} from 'zss/memory/types'
import { READ_CONTEXT } from 'zss/words/reader'
import { COLOR, NAME } from 'zss/words/types'

export function boardremixsnapshot(board: string) {
  const boardcodepage = bookreadcodepagewithtype(
    READ_CONTEXT.book,
    CODE_PAGE_TYPE.BOARD,
    board,
  )
  if (!ispresent(boardcodepage)) {
    return
  }
  //
}

export function boardremixrestart(board: string) {
  const boardcodepage = bookreadcodepagewithtype(
    READ_CONTEXT.book,
    CODE_PAGE_TYPE.BOARD,
    board,
  )
  if (!ispresent(boardcodepage)) {
    return
  }
  //
}

// need to add vars to tweak the gen
// we can give it an alea rngwith seed
export function boardremix(target: string, source: string) {
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

  debugger

  // make sure lookup is created
  bookboardsetlookup(READ_CONTEXT.book, targetboard)
  bookboardsetlookup(READ_CONTEXT.book, sourceboard)

  // element map
  let akind = 0 // kind
  const elementkindtoalphamap = new Map<string, number>()
  const elementalphatokindmap = new Map<number, string>()

  // scan board into image
  let p = 0
  const data = new Uint8Array(BOARD_SIZE * 4)
  for (let y = 0; y < BOARD_HEIGHT; ++y) {
    for (let x = 0; x < BOARD_WIDTH; ++x) {
      const el = boardelementread(sourceboard, { x, y })
      // r, g, b - char, color, bg
      data[p++] = el?.char ?? 0 // in this case we have to ignore 0
      data[p++] = el?.color ?? COLOR.ONCLEAR // onclear here means unset
      data[p++] = el?.bg ?? COLOR.ONCLEAR // onclear here means unset
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

  // generate new image
  const model = new wfc.OverlappingModel(
    data,
    BOARD_WIDTH,
    BOARD_HEIGHT,
    2,
    BOARD_WIDTH,
    BOARD_HEIGHT,
    true,
    false,
    2,
    0,
  )
  if (!model.iterate(24)) {
    api_error(SOFTWARE, 'boardremix', 'failed to generate after 24 tries')
    return
  }

  // unpack bytes onto targetboard
  p = 0
  const remixdata: Uint8Array = model.graphics()
  for (let y = 0; y < BOARD_HEIGHT; ++y) {
    for (let x = 0; x < BOARD_WIDTH; ++x) {
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
      // create new element
      const maybekind = elementalphatokindmap.get(akind) ?? ''
      const maybenew = bookboardwritefromkind(
        READ_CONTEXT.book,
        targetboard,
        [maybekind],
        { x, y },
      )
      // apply display
      if (ispresent(maybenew)) {
        if (dchar > 0) {
          maybenew.char = dchar
        }
        if (dcolor < 16) {
          maybenew.color = dcolor
        }
        if (dbg < 16) {
          maybenew.bg = dbg
        }
      }
      // sample source board example of 'kind'
      // to figure out what to put under an object element
      // and randomly select an element to copy the code from
    }
  }
}
