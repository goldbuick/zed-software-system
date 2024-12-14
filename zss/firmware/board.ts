import { CHIP } from 'zss/chip'
import { createfirmware } from 'zss/firmware'
import { ispresent, isstring, MAYBE } from 'zss/mapping/types'
import { MEMORY_LABEL } from 'zss/memory'
import {
  checkcollision,
  listelementsbykind,
  listnamedelements,
} from 'zss/memory/atomics'
import { boardelementread, boardterrainsetfromkind } from 'zss/memory/board'
import { boardelementwritestats } from 'zss/memory/boardelement'
import {
  bookboardelementreadname,
  bookboardmoveobject,
  bookboardobjectnamedlookupdelete,
  bookboardobjectsafedelete,
  bookboardsetlookup,
  bookboardwrite,
  bookboardwriteheadlessobject,
  bookelementkindread,
} from 'zss/memory/book'
import { BOARD, BOARD_ELEMENT, BOOK } from 'zss/memory/types'
import { dirfrompts, ispt, ptapplydir } from 'zss/words/dir'
import {
  readstrkindbg,
  readstrkindcolor,
  readstrkindname,
} from 'zss/words/kind'
import { ARG_TYPE, READ_CONTEXT, readargs } from 'zss/words/reader'
import { COLLISION, PT } from 'zss/words/types'

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
    chip.send(toid, message, from)
  }
}

function bonkelement(
  book: MAYBE<BOOK>,
  board: MAYBE<BOARD>,
  blocked: MAYBE<BOARD_ELEMENT>,
  dest: PT,
) {
  if (ispresent(blocked?.id)) {
    // mark headless
    blocked.headless = true
    // drop from luts
    bookboardobjectnamedlookupdelete(book, board, blocked)
  } else {
    boardterrainsetfromkind(board, dest, 'empty')
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
      bonkelement(book, board, blocked, dest)
    }

    return false
  }
  return true
}

export const BOARD_FIRMWARE = createfirmware({
  get() {
    return [false, undefined]
  },
  set() {
    return [false, undefined]
  },
  shouldtick() {},
  tick() {},
  tock() {},
})
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
            !bookboardobjectsafedelete(
              READ_CONTEXT.book,
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
  .command('shoot', (chip, words) => {
    if (!ispresent(READ_CONTEXT.book) || !ispresent(READ_CONTEXT.board)) {
      return 0
    }

    // invalid data
    if (!ispt(READ_CONTEXT.element)) {
      return 0
    }

    // read direction + what to shoot
    const [maybedir, maybekind] = readargs(words, 0, [
      ARG_TYPE.DIR,
      ARG_TYPE.MAYBE_KIND,
    ])

    // this feels a little silly
    const dir = dirfrompts(READ_CONTEXT.element, maybedir)
    const step = ptapplydir({ x: 0, y: 0 }, dir)
    const start = ptapplydir(
      { x: READ_CONTEXT.element.x, y: READ_CONTEXT.element.y },
      dir,
    )

    // make sure lookup is created
    bookboardsetlookup(READ_CONTEXT.book, READ_CONTEXT.board)

    // check starting point
    let blocked = boardelementread(READ_CONTEXT.board, start)

    // check for terrain that doesn't block bullets
    if (ispresent(blocked) && !ispresent(blocked.id)) {
      const selfkind = bookelementkindread(
        READ_CONTEXT.book,
        READ_CONTEXT.element,
      )
      const blockedkind = bookelementkindread(READ_CONTEXT.book, blocked)
      // found terrain
      if (
        !checkcollision(
          blocked.collision ?? selfkind?.collision,
          blocked.collision ?? blockedkind?.collision,
        )
      ) {
        blocked = undefined
      }
    }

    if (ispresent(blocked)) {
      // blocked by object, send message
      if (ispresent(blocked.id)) {
        sendinteraction(chip, blocked, chip.id(), 'shot')
      }

      // delete destructible elements
      const blockedkind = bookelementkindread(READ_CONTEXT.book, blocked)
      if (blocked.destructible ?? blockedkind?.destructible) {
        bonkelement(READ_CONTEXT.book, READ_CONTEXT.board, blocked, start)
      }

      // and start bullet in headless mode
      const bullet = bookboardwriteheadlessobject(
        READ_CONTEXT.book,
        READ_CONTEXT.board,
        maybekind ?? ['bullet'],
        start,
      )

      // success ! start with thud message
      if (ispresent(bullet)) {
        bullet.collision = COLLISION.ISBULLET
        sendinteraction(chip, chip.id(), blocked, 'thud')
      }
    } else {
      // write new element
      const bullet = bookboardwrite(
        READ_CONTEXT.book,
        READ_CONTEXT.board,
        maybekind ?? ['bullet'],
        start,
      )
      // success ! get it moving
      if (ispresent(bullet)) {
        bullet.collision = COLLISION.ISBULLET
        boardelementwritestats(bullet, {
          stepx: step.x,
          stepy: step.y,
        })
      }
    }

    // and yield regardless of the outcome
    chip.yield()
    return 0
  })
  .command('throwstar', (chip, words) => {
    return chip.command('shoot', ...words, 'star') ? 1 : 0
  })
