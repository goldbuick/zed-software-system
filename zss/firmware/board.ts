import { CHIP } from 'zss/chip'
import { createfirmware } from 'zss/firmware'
import { pick } from 'zss/mapping/array'
import { ispresent } from 'zss/mapping/types'
import { memorymoveobject, memorytickobject } from 'zss/memory'
import { listelementsbykind, listnamedelements } from 'zss/memory/atomics'
import {
  boardelementread,
  boardobjectread,
  boardsetterrain,
} from 'zss/memory/board'
import { boardelementisobject, boardelementname } from 'zss/memory/boardelement'
import {
  bookboardcheckblockedobject,
  bookboardmoveobject,
  bookboardnamedwrite,
  bookboardsafedelete,
  bookboardsetlookup,
  bookboardwritefromkind,
  bookboardwritebulletobject,
  bookelementkindread,
  bookplayermovetoboard,
  bookreadcodepagesbytypeandstat,
} from 'zss/memory/book'
import { BOARD_HEIGHT, BOARD_WIDTH, CODE_PAGE_TYPE } from 'zss/memory/types'
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
import { CATEGORY, COLLISION, COLOR, DIR, PT, WORD } from 'zss/words/types'

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

  debugger

  // make sure lookup is created
  bookboardsetlookup(READ_CONTEXT.book, READ_CONTEXT.board)

  // read
  const [dir, kind] = readargs(words, 0, [ARG_TYPE.DIR, ARG_TYPE.KIND])

  // check if we are blocked by a pushable
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

  // validate placement works
  const blocked = bookboardcheckblockedobject(
    READ_CONTEXT.book,
    READ_CONTEXT.board,
    COLLISION.ISWALK, // this should be the collision of the thing being plotted
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

export const BOARD_FIRMWARE = createfirmware()
  .command('board', (_, words) => {
    if (!ispresent(READ_CONTEXT.book)) {
      return 0
    }
    // teleport player to a board with given stat
    const [stat, maybex, maybey] = readargs(words, 0, [
      ARG_TYPE.NAME,
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

    const [dir, movedir] = readargs(words, 0, [ARG_TYPE.DIR, ARG_TYPE.DIR])
    const maybetarget = boardelementread(READ_CONTEXT.board, dir)
    if (boardelementisobject(maybetarget)) {
      memorymoveobject(
        READ_CONTEXT.book,
        READ_CONTEXT.board,
        maybetarget,
        movedir,
      )
    }
    return 0
  })
  .command('duplicate', () => {
    if (!ispresent(READ_CONTEXT.book) || !ispresent(READ_CONTEXT.board)) {
      return 0
    }
    // const [dir, duplicatedir] = readargs(words, 0, [ARG_TYPE.DIR, ARG_TYPE.DIR])
    // const maybetarget = boardelementread(READ_CONTEXT.board, dir)
    // if (ispresent(maybetarget)) {
    //   // update lookup (only objects)
    //   // bookboardobjectlookupwrite(book, board, object)
    // }
    return 0
  })
  .command('replace', (_, words) => {
    if (!ispresent(READ_CONTEXT.book) || !ispresent(READ_CONTEXT.board)) {
      return 0
    }

    // make sure lookup is created
    bookboardsetlookup(READ_CONTEXT.book, READ_CONTEXT.board)

    const [dir, kind] = readargs(words, 0, [ARG_TYPE.DIR, ARG_TYPE.KIND])
    const maybetarget = boardelementread(READ_CONTEXT.board, dir)
    if (boardelementisobject(maybetarget)) {
      bookboardsafedelete(
        READ_CONTEXT.book,
        READ_CONTEXT.board,
        maybetarget,
        READ_CONTEXT.timestamp,
      )
    }
    bookboardwritefromkind(READ_CONTEXT.book, READ_CONTEXT.board, kind, dir)
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
      const terrain = boardsetterrain(READ_CONTEXT.board, {
        x: dir.x + i,
        y: dir.y,
        char: context.char[i],
        color: context.color[i],
        bg: context.bg[i],
      })
      // update named (terrain)
      if (ispresent(terrain)) {
        const index = (terrain.x ?? 0) + (terrain.y ?? 0) * BOARD_WIDTH
        bookboardnamedwrite(
          READ_CONTEXT.book,
          READ_CONTEXT.board,
          terrain,
          index,
        )
      }
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

    // make sure lookup is created
    bookboardsetlookup(READ_CONTEXT.book, READ_CONTEXT.board)

    // begin filtering
    const targetname = readstrkindname(target) ?? ''
    const boardelements = listnamedelements(READ_CONTEXT.board, targetname)
    const targetelements = listelementsbykind(boardelements, target)

    // modify attrs
    const intoname = readstrkindname(into)
    const intocolor = readstrkindcolor(into)
    const intobg = readstrkindbg(into)

    // modify elements
    targetelements.forEach((element) => {
      if (boardelementname(element) === intoname) {
        if (ispresent(intocolor)) {
          element.color = intocolor
        }
        if (ispresent(intobg)) {
          element.bg = intobg
        }
      } else {
        // delete object
        if (
          ispresent(element.id) &&
          bookboardsafedelete(
            READ_CONTEXT.book,
            READ_CONTEXT.board,
            element,
            READ_CONTEXT.timestamp,
          )
        ) {
          // bail
          return 0
        }
        // create new element
        if (ispt(element)) {
          bookboardwritefromkind(
            READ_CONTEXT.book,
            READ_CONTEXT.board,
            into,
            element,
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
