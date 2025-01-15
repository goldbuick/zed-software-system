import { CHIP } from 'zss/chip'
import { createfirmware } from 'zss/firmware'
import { ispresent, isstring, MAYBE } from 'zss/mapping/types'
import { MEMORY_LABEL, memorytickobject } from 'zss/memory'
import { listelementsbykind, listnamedelements } from 'zss/memory/atomics'
import { boardterrainsetfromkind } from 'zss/memory/board'
import {
  bookboardelementreadname,
  bookboardmoveobject,
  bookboardobjectnamedlookupdelete,
  bookboardsafedelete,
  bookboardsetlookup,
  bookboardwrite,
  bookboardwritebulletobject,
  bookelementkindread,
} from 'zss/memory/book'
import { BOARD, BOARD_ELEMENT, BOOK } from 'zss/memory/types'
import { ispt } from 'zss/words/dir'
import {
  readstrkindbg,
  readstrkindcolor,
  readstrkindname,
} from 'zss/words/kind'
import { ARG_TYPE, READ_CONTEXT, readargs } from 'zss/words/reader'
import { COLLISION, PT, WORD } from 'zss/words/types'

function sendinteraction(
  chip: CHIP,
  maybefrom: BOARD_ELEMENT | string,
  maybeto: BOARD_ELEMENT | string,
  message: string,
) {
  const fromid = isstring(maybefrom) ? maybefrom : maybefrom.id
  const frompt: PT | undefined = isstring(maybefrom)
    ? undefined
    : { x: maybefrom.x ?? 0, y: maybefrom.y ?? 0 }
  const toid = isstring(maybeto) ? maybeto : maybeto.id

  // object elements will have ids
  const from = fromid ?? frompt

  if (ispresent(toid) && ispresent(from)) {
    console.info('sendinteraction', message, maybeto, toid, from)
    chip.send(toid, message, from)
  }
}

export function moveobject(
  chip: CHIP,
  book: MAYBE<BOOK>,
  board: MAYBE<BOARD>,
  target: BOARD_ELEMENT,
  dest: PT,
) {
  const blocked = bookboardmoveobject(book, board, target, dest)
  if (ispresent(blocked)) {
    sendinteraction(chip, blocked, chip.id(), 'thud')
    if (target.kind === MEMORY_LABEL.PLAYER) {
      sendinteraction(chip, chip.id(), blocked, 'touch')
      // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
    } else if (target.collision === COLLISION.ISBULLET) {
      sendinteraction(chip, chip.id(), blocked, 'shot')
    } else {
      sendinteraction(chip, chip.id(), blocked, 'bump')
    }
    // delete destructible elements
    const blockedkind = bookelementkindread(book, blocked)
    if (blocked.destructible ?? blockedkind?.destructible) {
      if (ispresent(blocked?.id)) {
        // mark target for deletion
        bookboardsafedelete(
          READ_CONTEXT.book,
          READ_CONTEXT.board,
          blocked,
          READ_CONTEXT.timestamp,
        )
      } else {
        // overwrite terrain with empty
        boardterrainsetfromkind(board, dest, 'empty')
      }
      return true
    }
    return false
  }
  return true
}

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
    bullet.arg = arg

    // ensure correct collection type
    bullet.collision = COLLISION.ISBULLET
    // ensure destructible
    bullet.destructible = 1
    // set walking direction
    bullet.stepx = dir.x - READ_CONTEXT.element.x
    bullet.stepy = dir.y - READ_CONTEXT.element.y

    // object code
    const kind = bookelementkindread(READ_CONTEXT.book, bullet)
    const code = bullet.code ?? kind?.code ?? ''

    // bullets get one immediate tick
    memorytickobject(READ_CONTEXT.book, READ_CONTEXT.board, bullet, code, 1)

    // determine outcome
    if (
      bullet.x !== READ_CONTEXT.element.x ||
      bullet.y !== READ_CONTEXT.element.y
    ) {
      // if we run into something skip
      // otherwise add to bucket
      chip.bucket(bullet.id)
    }
  }

  // yield after shoot
  chip.yield()
  return 0
}

export const BOARD_FIRMWARE = createfirmware()
  .command('change', (_, words) => {
    if (!ispresent(READ_CONTEXT.book) || !ispresent(READ_CONTEXT.board)) {
      return 0
    }

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
      if (bookboardelementreadname(READ_CONTEXT.book, element) === intoname) {
        if (ispresent(intocolor)) {
          element.color = intocolor
        }
        if (ispresent(intobg)) {
          element.bg = intobg
        }
      } else {
        // delete object
        if (ispresent(element.id)) {
          // make invisible
          bookboardobjectnamedlookupdelete(
            READ_CONTEXT.book,
            READ_CONTEXT.board,
            element,
          )
          // hit with delete
          if (
            !bookboardsafedelete(
              READ_CONTEXT.book,
              READ_CONTEXT.board,
              element,
              READ_CONTEXT.timestamp,
            )
          ) {
            // bail
            return
          }
        }
        // create new element
        if (ispt(element)) {
          bookboardwrite(READ_CONTEXT.book, READ_CONTEXT.board, into, element)
        }
      }
    })

    return 0
  })
  .command('put', (_, words) => {
    if (!ispresent(READ_CONTEXT.book) || !ispresent(READ_CONTEXT.board)) {
      return 0
    }

    // read
    const [dir, kind] = readargs(words, 0, [ARG_TYPE.DIR, ARG_TYPE.KIND])

    // make sure lookup is created
    bookboardsetlookup(READ_CONTEXT.book, READ_CONTEXT.board)

    // write new element
    bookboardwrite(READ_CONTEXT.book, READ_CONTEXT.board, kind, dir)
    return 0
  })
  .command('shootwith', (chip, words) => {
    const [arg, ii] = readargs(words, 0, [ARG_TYPE.ANY])
    return commandshoot(chip, words.slice(ii), arg)
  })
  .command('shoot', commandshoot)
  .command('throwstar', () => {
    // TODO, may not be needed
    return 0
  })
