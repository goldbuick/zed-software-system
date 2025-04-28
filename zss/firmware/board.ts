import { degToRad } from 'maath/misc'
import { CHIP } from 'zss/chip'
import { boardpivot } from 'zss/feature/boardpivot'
import {
  boardremix,
  boardremixrestart,
  boardremixsnapshot,
} from 'zss/feature/boardremix'
import { createfirmware } from 'zss/firmware'
import { pick } from 'zss/mapping/array'
import { isnumber, ispresent, isstring, MAYBE } from 'zss/mapping/types'
import { memorymoveobject, memorytickobject } from 'zss/memory'
import { listelementsbykind, listptsbyempty } from 'zss/memory/atomics'
import {
  boardelementread,
  boardgetterrain,
  boardobjectread,
  boardsetterrain,
} from 'zss/memory/board'
import { boardelementisobject, boardelementname } from 'zss/memory/boardelement'
import {
  bookelementkindread,
  bookplayermovetoboard,
  bookreadcodepagesbytypeandstat,
  bookreadobject,
  bookreadterrain,
} from 'zss/memory/book'
import {
  bookboardcheckblockedobject,
  bookboardmoveobject,
  bookboardsafedelete,
  bookboardsetlookup,
  bookboardwritefromkind,
  bookboardwritebulletobject,
} from 'zss/memory/bookboard'
import { codepagereaddata } from 'zss/memory/codepage'
import {
  BOARD,
  BOARD_ELEMENT,
  BOARD_HEIGHT,
  BOARD_WIDTH,
  BOOK,
  CODE_PAGE_TYPE,
} from 'zss/memory/types'
import { mapstrcolortoattributes } from 'zss/words/color'
import { dirfrompts, ispt, ptapplydir } from 'zss/words/dir'
import {
  readstrkindbg,
  readstrkindcolor,
  readstrkindname,
} from 'zss/words/kind'
import { ARG_TYPE, READ_CONTEXT, readargs } from 'zss/words/reader'
import {
  createwritetextcontext,
  tokenizeandmeasuretextformat,
  tokenizeandwritetextformat,
} from 'zss/words/textformat'
import {
  CATEGORY,
  COLLISION,
  COLOR,
  DIR,
  NAME,
  PT,
  WORD,
} from 'zss/words/types'

function commandshoot(chip: CHIP, words: WORD[], arg?: WORD): 0 | 1 {
  // invalid data
  if (!ispt(READ_CONTEXT.element)) {
    return 0
  }

  // read direction + what to shoot
  const [dir, kind] = readargs(words, 0, [ARG_TYPE.DIR, ARG_TYPE.MAYBE_KIND])

  // write new element
  const bulletkind = kind ?? ['bullet']
  const bullet = bookboardwritebulletobject(
    READ_CONTEXT.book,
    READ_CONTEXT.board,
    bulletkind,
    {
      x: READ_CONTEXT.element.x,
      y: READ_CONTEXT.element.y,
    },
  )

  // success ! get it moving
  if (ispresent(bullet)) {
    // write arg
    if (ispresent(arg)) {
      bullet.arg = arg
    }
    // write party info
    bullet.party = READ_CONTEXT.elementid
    // ensure correct collection type
    bullet.collision = COLLISION.ISBULLET
    // ensure destructible
    bullet.destructible = 1
    // set walking direction
    bullet.stepx = dir.x - READ_CONTEXT.element.x
    bullet.stepy = dir.y - READ_CONTEXT.element.y
    // things shot always have the clear bg
    bullet.bg = COLOR.ONCLEAR
    // object code
    const kind = bookelementkindread(READ_CONTEXT.book, bullet)
    const code = bullet.code ?? kind?.code ?? ''
    // bullets get one immediate tick
    memorytickobject(READ_CONTEXT.book, READ_CONTEXT.board, bullet, code, 1)
  }

  // yield after shoot
  chip.yield()
  return 0
}

function commandput(_: any, words: WORD[], id?: string, arg?: WORD): 0 | 1 {
  // invalid data
  if (
    !ispt(READ_CONTEXT.element) ||
    !ispresent(READ_CONTEXT.book) ||
    !ispresent(READ_CONTEXT.board) ||
    !ispresent(READ_CONTEXT.element)
  ) {
    return 0
  }

  // make sure lookup is created
  bookboardsetlookup(READ_CONTEXT.book, READ_CONTEXT.board)

  // read
  const [dir, kind] = readargs(words, 0, [ARG_TYPE.DIR, ARG_TYPE.KIND])

  // check if we are blocked by a pushable object element
  const target = boardelementread(READ_CONTEXT.board, dir)
  if (target?.category === CATEGORY.ISOBJECT && target?.pushable) {
    const from: PT = {
      x: READ_CONTEXT.element?.x ?? 0,
      y: READ_CONTEXT.element?.y ?? 0,
    }
    // attempt to shove it away
    const pt = ptapplydir(dir, dirfrompts(from, dir))
    bookboardmoveobject(READ_CONTEXT.book, READ_CONTEXT.board, target, pt)
  }

  // get kind's collision type
  const [kindname] = kind
  const kinddata =
    bookreadobject(READ_CONTEXT.book, kindname) ??
    bookreadterrain(READ_CONTEXT.book, kindname)
  const collision = kinddata?.collision ?? COLLISION.ISWALK

  // validate placement works
  const blocked = bookboardcheckblockedobject(
    READ_CONTEXT.book,
    READ_CONTEXT.board,
    collision,
    dir,
  )

  // write new element
  if (!blocked) {
    const element = bookboardwritefromkind(
      READ_CONTEXT.book,
      READ_CONTEXT.board,
      kind,
      dir,
      id,
    )
    if (ispresent(element) && ispresent(arg)) {
      element.arg = arg
    }
  }

  return 0
}

function emptyarea(book: BOOK, board: BOARD, p1: PT, p2: PT) {
  for (let y = p1.y; y <= p2.y; ++y) {
    for (let x = p1.x; x <= p2.x; ++x) {
      const maybeobject = boardelementread(board, { x, y })
      if (boardelementisobject(maybeobject)) {
        bookboardsafedelete(book, board, maybeobject, book.timestamp)
      }
      boardsetterrain(board, { x, y })
    }
  }
}

function emptyareaterrain(book: BOOK, board: BOARD, p1: PT, p2: PT) {
  for (let y = p1.y; y <= p2.y; ++y) {
    for (let x = p1.x; x <= p2.x; ++x) {
      boardsetterrain(board, { x, y })
    }
  }
}

function emptyareaobject(book: BOOK, board: BOARD, p1: PT, p2: PT) {
  for (let y = p1.y; y <= p2.y; ++y) {
    for (let x = p1.x; x <= p2.x; ++x) {
      const maybeobject = boardelementread(board, { x, y })
      if (boardelementisobject(maybeobject)) {
        bookboardsafedelete(book, board, maybeobject, book.timestamp)
      }
      boardsetterrain(board, { x, y })
    }
  }
}

function mapelementcopy(maybenew: MAYBE<BOARD_ELEMENT>, from: BOARD_ELEMENT) {
  if (!ispresent(maybenew)) {
    return
  }
  // copy __some__ of the stats
  maybenew.char = from.char
  maybenew.color = from.color
  maybenew.bg = from.bg
  maybenew.p1 = from.p1
  maybenew.p2 = from.p2
  maybenew.p3 = from.p3
  maybenew.code = from.code
  maybenew.cycle = from.cycle
  maybenew.light = from.light
  maybenew.stepx = from.stepx
  maybenew.stepy = from.stepy
  maybenew.pushable = from.pushable
  maybenew.collision = from.collision
  maybenew.destructible = from.destructible
}

function maptargetset(word: any) {
  if (isstring(word)) {
    const maybetarget = NAME(word)
    switch (maybetarget) {
      case 'all':
      case 'object':
      case 'terrain':
        return maybetarget
    }
  }
  return undefined
}

export const BOARD_FIRMWARE = createfirmware()
  .command('snapshot', (_, words) => {
    if (!ispresent(READ_CONTEXT.book) || !ispresent(READ_CONTEXT.board)) {
      return 0
    }
    // check for subcommand
    const [maybestat] = readargs(words, 0, [ARG_TYPE.MAYBE_NAME])
    if (maybestat) {
      boardremixrestart(READ_CONTEXT.board.id)
    } else {
      boardremixsnapshot(READ_CONTEXT.board.id)
    }
    return 0
  })
  .command('remix', (_, words) => {
    if (!ispresent(READ_CONTEXT.book) || !ispresent(READ_CONTEXT.board)) {
      return 0
    }
    // remix current board with a board that matches given given stat
    const [stat, pattersize, mirror, x1, y1, x2, y2] = readargs(words, 0, [
      ARG_TYPE.NAME,
      ARG_TYPE.MAYBE_NUMBER,
      ARG_TYPE.MAYBE_NUMBER,
      ARG_TYPE.MAYBE_NUMBER,
      ARG_TYPE.MAYBE_NUMBER,
      ARG_TYPE.MAYBE_NUMBER,
      ARG_TYPE.MAYBE_NUMBER,
    ])
    const boards = bookreadcodepagesbytypeandstat(
      READ_CONTEXT.book,
      CODE_PAGE_TYPE.BOARD,
      stat,
    )
    const sourceboard = pick(...boards)
    if (ispresent(sourceboard)) {
      const pt1 = ispresent(x1) && ispresent(y1) ? { x: x1, y: y1 } : undefined
      const pt2 = ispresent(x2) && ispresent(y2) ? { x: x2, y: y2 } : undefined
      boardremix(
        READ_CONTEXT.board.id,
        sourceboard.id,
        pattersize,
        mirror,
        pt1,
        pt2,
      )
    }
    return 0
  })
  .command('weave', (_, words) => {
    // <dir> [number] [all|terrain|objects]
    const [dir, maybeop1, maybeop2] = readargs(words, 0, [
      ARG_TYPE.DIR,
      ARG_TYPE.MAYBE_NUMBER_OR_STRING,
      ARG_TYPE.MAYBE_NUMBER_OR_STRING,
    ])
    console.info({ dir, maybeop1, maybeop2 })
    return 0
  })
  .command('pivot', (_, words) => {
    if (!ispresent(READ_CONTEXT.book) || !ispresent(READ_CONTEXT.board)) {
      return 0
    }
    // rotate board
    // [number] [all|terrain|object]
    const args = readargs(words, 0, [
      ARG_TYPE.NUMBER_OR_STRING,
      ARG_TYPE.MAYBE_NUMBER_OR_STRING,
    ])
    let radians = 0
    let opfilter: MAYBE<string> = ''
    for (let i = 0; i < args.length - 1; ++i) {
      const arg = args[i]
      if (isstring(arg)) {
        opfilter = maptargetset(arg)
      }
      if (isnumber(arg)) {
        radians = degToRad(arg)
      }
    }
    if (radians && isstring(opfilter)) {
      boardpivot(
        READ_CONTEXT.board.id,
        radians,
        opfilter !== 'object',
        opfilter !== 'terrain',
      )
    }
    return 0
  })
  .command('copy', (_, words) => {
    if (!ispresent(READ_CONTEXT.book) || !ispresent(READ_CONTEXT.board)) {
      return 0
    }
    // copy partial board
    // <stat> <x1> ... <y2> [all|terrain|object]
    const [stat, x1, y1, x2, y2, maybeop1] = readargs(words, 0, [
      ARG_TYPE.NAME,
      ARG_TYPE.NUMBER,
      ARG_TYPE.NUMBER,
      ARG_TYPE.NUMBER,
      ARG_TYPE.NUMBER,
      ARG_TYPE.MAYBE_STRING,
    ])
    const opfilter = maptargetset(maybeop1)
    const boards = bookreadcodepagesbytypeandstat(
      READ_CONTEXT.book,
      CODE_PAGE_TYPE.BOARD,
      stat,
    )
    const sourceboard = codepagereaddata<CODE_PAGE_TYPE.BOARD>(pick(...boards))
    // make sure lookup is created
    bookboardsetlookup(READ_CONTEXT.book, READ_CONTEXT.board)
    bookboardsetlookup(READ_CONTEXT.book, sourceboard)
    if (ispresent(sourceboard)) {
      switch (opfilter) {
        default:
        case 'all':
          emptyarea(
            READ_CONTEXT.book,
            READ_CONTEXT.board,
            { x: x1, y: y1 },
            { x: x2, y: y2 },
          )
          break
        case 'object':
          emptyareaobject(
            READ_CONTEXT.book,
            READ_CONTEXT.board,
            { x: x1, y: y1 },
            { x: x2, y: y2 },
          )
          break
        case 'terrain':
          emptyareaterrain(
            READ_CONTEXT.book,
            READ_CONTEXT.board,
            { x: x1, y: y1 },
            { x: x2, y: y2 },
          )
          break
      }
      // copy new elements
      for (let y = y1; y <= y2; ++y) {
        for (let x = x1; x <= x2; ++x) {
          let copyobject = false
          let copyterrain = false
          switch (opfilter) {
            default:
            case 'all':
              copyobject = true
              copyterrain = true
              break
            case 'object':
              copyobject = true
              break
            case 'terrain':
              copyterrain = true
              break
          }
          let terrain: MAYBE<BOARD_ELEMENT>
          let object = boardelementread(sourceboard, { x, y })
          if (boardelementisobject(object)) {
            terrain = boardgetterrain(sourceboard, x, y)
          } else {
            terrain = object
            object = undefined
          }
          if (ispresent(terrain) && copyterrain) {
            const el = bookboardwritefromkind(
              READ_CONTEXT.book,
              READ_CONTEXT.board,
              [terrain.kind ?? ''],
              { x, y },
            )
            mapelementcopy(el, terrain)
          }
          if (ispresent(object) && copyobject) {
            const el = bookboardwritefromkind(
              READ_CONTEXT.book,
              READ_CONTEXT.board,
              [object.kind ?? ''],
              { x, y },
            )
            mapelementcopy(el, object)
          }
        }
      }
    }
    return 0
  })
  .command('board', (_, words) => {
    if (!ispresent(READ_CONTEXT.book) || !ispresent(READ_CONTEXT.board)) {
      return 0
    }
    const [stat, ii] = readargs(words, 0, [ARG_TYPE.NAME])
    // teleport player to a board with given stat
    const [maybex, maybey] = readargs(words, ii, [
      ARG_TYPE.MAYBE_NUMBER,
      ARG_TYPE.MAYBE_NUMBER,
    ])
    const boards = bookreadcodepagesbytypeandstat(
      READ_CONTEXT.book,
      CODE_PAGE_TYPE.BOARD,
      stat,
    )
    if (boards.length) {
      const target = pick(...boards)
      if (ispresent(target)) {
        bookplayermovetoboard(
          READ_CONTEXT.book,
          READ_CONTEXT.elementfocus,
          target.id,
          {
            x: maybex ?? Math.round(BOARD_WIDTH * 0.5),
            y: maybey ?? Math.round(BOARD_HEIGHT * 0.5),
          },
        )
      }
    }
    return 0
  })
  .command('edge', (_, words) => {
    if (
      !ispresent(READ_CONTEXT.book) ||
      !ispresent(READ_CONTEXT.board) ||
      !ispresent(READ_CONTEXT.element)
    ) {
      return 0
    }
    const [dir, stat] = readargs(words, 0, [ARG_TYPE.DIR, ARG_TYPE.NAME])
    const boards = bookreadcodepagesbytypeandstat(
      READ_CONTEXT.book,
      CODE_PAGE_TYPE.BOARD,
      stat,
    )
    if (boards.length) {
      const pt: PT = {
        x: READ_CONTEXT.element?.x ?? 0,
        y: READ_CONTEXT.element?.y ?? 0,
      }
      const edgedir = dirfrompts(pt, dir)
      const target = pick(...boards)
      switch (edgedir) {
        case DIR.NORTH:
          READ_CONTEXT.board.exitnorth = target.id
          break
        case DIR.SOUTH:
          READ_CONTEXT.board.exitsouth = target.id
          break
        case DIR.WEST:
          READ_CONTEXT.board.exitwest = target.id
          break
        case DIR.EAST:
          READ_CONTEXT.board.exiteast = target.id
          break
      }
    }
    return 0
  })
  .command('shove', (_, words) => {
    if (!ispresent(READ_CONTEXT.book) || !ispresent(READ_CONTEXT.board)) {
      return 0
    }

    // make sure lookup is created
    bookboardsetlookup(READ_CONTEXT.book, READ_CONTEXT.board)

    // shove target at dir, in the direction of the given dir
    const [dir, movedir] = readargs(words, 0, [ARG_TYPE.DIR, ARG_TYPE.DIR])
    const maybetarget = boardelementread(READ_CONTEXT.board, dir)
    if (boardelementisobject(maybetarget)) {
      // should we delay when we evaluate the dir ?
      // movedir should be a delta between .element & movedir
      // then add the delta to maybetarget
      memorymoveobject(
        READ_CONTEXT.book,
        READ_CONTEXT.board,
        maybetarget,
        movedir,
      )
    }
    return 0
  })
  .command('duplicate', (_, words) => {
    if (!ispresent(READ_CONTEXT.book) || !ispresent(READ_CONTEXT.board)) {
      return 0
    }

    // make sure lookup is created
    bookboardsetlookup(READ_CONTEXT.book, READ_CONTEXT.board)

    // duplicate target at dir, in the direction of the given dir
    const [dir, movedir] = readargs(words, 0, [ARG_TYPE.DIR, ARG_TYPE.DIR])
    const maybetarget = boardelementread(READ_CONTEXT.board, dir)

    if (boardelementisobject(maybetarget)) {
      // object
    } else if (ispresent(maybetarget)) {
      // terrain
    }
    return 0
  })
  .command('write', (_, words) => {
    if (!ispresent(READ_CONTEXT.book) || !ispresent(READ_CONTEXT.board)) {
      return 0
    }

    // make sure lookup is created
    bookboardsetlookup(READ_CONTEXT.book, READ_CONTEXT.board)

    const [dir, strcolor, text] = readargs(words, 0, [
      ARG_TYPE.DIR,
      ARG_TYPE.COLOR,
      ARG_TYPE.STRING,
    ])
    const { color, bg } = mapstrcolortoattributes(strcolor)
    const measuredwidth =
      tokenizeandmeasuretextformat(text, 256, 1)?.measuredwidth ?? 1
    const context = createwritetextcontext(
      256,
      1,
      color ?? COLOR.WHITE,
      bg ?? COLOR.BLACK,
    )
    tokenizeandwritetextformat(text, context, false)
    for (let i = 0; i < measuredwidth; ++i) {
      // create new terrain element
      boardsetterrain(READ_CONTEXT.board, {
        x: dir.x + i,
        y: dir.y,
        name: 'text',
        char: context.char[i],
        color: context.color[i],
        bg: context.bg[i],
      })
    }
    return 0
  })
  .command('change', (_, words) => {
    if (!ispresent(READ_CONTEXT.book) || !ispresent(READ_CONTEXT.board)) {
      return 0
    }

    // make sure lookup is created
    bookboardsetlookup(READ_CONTEXT.book, READ_CONTEXT.board)

    // read
    const [target, into] = readargs(words, 0, [ARG_TYPE.KIND, ARG_TYPE.KIND])

    // begin filtering
    const targetname = readstrkindname(target) ?? ''
    if (targetname === 'empty') {
      // empty into something becomes a put
      listptsbyempty(READ_CONTEXT.board).forEach((pt) => {
        bookboardwritefromkind(READ_CONTEXT.book, READ_CONTEXT.board, into, pt)
      })
    }

    // modify attrs
    const intoname = readstrkindname(into)
    const intocolor = readstrkindcolor(into)
    const intobg = readstrkindbg(into)
    listelementsbykind(READ_CONTEXT.board, target).forEach((element) => {
      if (boardelementname(element) === intoname) {
        // modify existing elements
        if (ispresent(intocolor)) {
          element.color = intocolor
        }
        if (ispresent(intobg)) {
          element.bg = intobg
        }
      } else {
        // erase element
        bookboardsafedelete(
          READ_CONTEXT.book,
          READ_CONTEXT.board,
          element,
          READ_CONTEXT.timestamp,
        )
        // create new element
        if (intoname !== 'empty') {
          const pt = { x: element.x ?? 0, y: element.y ?? 0 }
          bookboardwritefromkind(
            READ_CONTEXT.book,
            READ_CONTEXT.board,
            into,
            pt,
          )
        }
      }
    })

    return 0
  })
  .command('putwith', (chip, words) => {
    const [arg, ii] = readargs(words, 0, [ARG_TYPE.ANY])
    return commandput(chip, words.slice(ii), undefined, arg)
  })
  .command('put', (chip, words) => {
    return commandput(chip, words)
  })
  .command('oneof', (chip, words) => {
    const [mark, ii] = readargs(words, 0, [ARG_TYPE.ANY])

    // if there is already an object with mark id, bail
    if (
      ispresent(READ_CONTEXT.board) &&
      boardobjectread(READ_CONTEXT.board, mark)
    ) {
      return 0
    }

    return commandput(chip, words.slice(ii), mark)
  })
  .command('oneofwith', (chip, words) => {
    const [arg, mark, ii] = readargs(words, 0, [ARG_TYPE.ANY, ARG_TYPE.ANY])

    // if there is already an object with mark id, bail
    if (
      ispresent(READ_CONTEXT.board) &&
      boardobjectread(READ_CONTEXT.board, mark)
    ) {
      return 0
    }

    return commandput(chip, words.slice(ii), mark, arg)
  })
  .command('shootwith', (chip, words) => {
    const [arg, ii] = readargs(words, 0, [ARG_TYPE.ANY])
    return commandshoot(chip, words.slice(ii), arg)
  })
  .command('shoot', commandshoot)
