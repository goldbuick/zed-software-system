import { CHIP } from 'zss/chip'
import { boardcopy, mapelementcopy } from 'zss/feature/boardcopy'
import { createfirmware } from 'zss/firmware'
import { clamp } from 'zss/mapping/number'
import { deepcopy, isnumber, ispresent, isstring } from 'zss/mapping/types'
import { maptostring } from 'zss/mapping/value'
import {
  memoryboardread,
  memoryelementkindread,
  memoryelementstatread,
  memorymoveobject,
  memorytickobject,
  memorywritebullet,
  memorywritefromkind,
} from 'zss/memory'
import { listelementsbykind, listptsbyempty } from 'zss/memory/atomics'
import {
  boardelementread,
  boardobjectread,
  boardsafedelete,
  boardsetterrain,
  createboard,
} from 'zss/memory/board'
import { boardelementisobject } from 'zss/memory/boardelement'
import { boardcheckblockedobject } from 'zss/memory/boardops'
import { bookelementdisplayread } from 'zss/memory/book'
import { bookplayermovetoboard } from 'zss/memory/bookplayer'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'
import { mapcolortostrcolor, mapstrcolortoattributes } from 'zss/words/color'
import { dirfrompts, ispt, isstrdir, ptapplydir } from 'zss/words/dir'
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
import { COLLISION, COLOR, DIR, PT, WORD } from 'zss/words/types'

function commandshoot(chip: CHIP, words: WORD[], arg?: WORD): 0 | 1 {
  // invalid data
  if (
    !ispresent(READ_CONTEXT.element?.x) ||
    !ispresent(READ_CONTEXT.element.y)
  ) {
    return 0
  }

  // read direction + what to shoot
  const [dir, kind] = readargs(words, 0, [ARG_TYPE.DIR, ARG_TYPE.MAYBE_KIND])

  // track shoot direction
  READ_CONTEXT.element.shootx = clamp(dir.destpt.x - dir.startpt.x, -1, 1)
  READ_CONTEXT.element.shooty = clamp(dir.destpt.y - dir.startpt.y, -1, 1)

  // write new element
  const bulletkind = kind ?? ['bullet']
  const bullet = memorywritebullet(READ_CONTEXT.board, bulletkind, {
    x: READ_CONTEXT.element.x,
    y: READ_CONTEXT.element.y,
  })

  // success ! get it moving
  if (ispresent(bullet)) {
    // write arg
    if (ispresent(arg)) {
      bullet.arg = arg
    }
    // always cycle 1
    bullet.cycle = 1
    // write party info
    bullet.party = READ_CONTEXT.elementid
    // ensure correct collection type
    bullet.collision = COLLISION.ISBULLET
    // ensure breakable
    bullet.breakable = 1
    // set walking direction
    bullet.stepx = dir.destpt.x - READ_CONTEXT.element.x
    bullet.stepy = dir.destpt.y - READ_CONTEXT.element.y
    // things shot always have the clear bg
    bullet.bg = COLOR.ONCLEAR
    // object code
    const kind = memoryelementkindread(bullet)
    const code = bullet.code ?? kind?.code ?? ''
    // bullets get one immediate tick
    memorytickobject(READ_CONTEXT.book, READ_CONTEXT.board, bullet, code)
  }

  // yield after shoot
  chip.yield()
  return 0
}

function commandput(words: WORD[], id?: string, arg?: WORD): 0 | 1 {
  // invalid data
  if (
    !ispt(READ_CONTEXT.element) ||
    !ispresent(READ_CONTEXT.book) ||
    !ispresent(READ_CONTEXT.board) ||
    !ispresent(READ_CONTEXT.element)
  ) {
    return 0
  }

  // read
  const [dir, kind] = readargs(words, 0, [ARG_TYPE.DIR, ARG_TYPE.KIND])

  // list of target points to put
  if (dir.targets.length) {
    for (let i = 0; i < dir.targets.length; ++i) {
      const target = dir.targets[i]
      commandput(['at', target.x, target.y, ...kind], id, arg)
    }
    return 0
  }

  // check clipping
  const { destpt } = dir
  if (
    destpt.x < 0 ||
    destpt.x >= BOARD_WIDTH ||
    destpt.y < 0 ||
    destpt.y >= BOARD_HEIGHT
  ) {
    return 0
  }

  // get kind we're putting
  const [kindname] = kind
  const from: PT = {
    x: READ_CONTEXT.element?.x ?? 0,
    y: READ_CONTEXT.element?.y ?? 0,
  }

  // get kind's collision type
  const kindelement = memoryelementkindread({ kind: kindname })
  const kindcollision = memoryelementstatread(kindelement, 'collision')
  if (kindcollision === COLLISION.ISGHOST) {
    // ghost elements have no collision
    memorywritefromkind(READ_CONTEXT.board, kind, dir.destpt, id)
    return 0
  }

  // check if we are blocked by a pushable object element
  let target = boardelementread(READ_CONTEXT.board, dir.destpt)
  const targetpushable = memoryelementstatread(target, 'pushable')
  if (targetpushable) {
    // attempt to shove it away
    const pivot = deepcopy(dir.destpt)
    const pt = ptapplydir(pivot, dirfrompts(from, pivot))
    memorymoveobject(READ_CONTEXT.book, READ_CONTEXT.board, target, pt)
    // grab new target
    target = boardelementread(READ_CONTEXT.board, dir.destpt)
  }

  // handle put empty case
  if (kindname === 'empty') {
    boardsafedelete(READ_CONTEXT.board, target, READ_CONTEXT.timestamp)
    return 0
  }

  // invoke safe delete
  if (boardelementisobject(target)) {
    boardsafedelete(READ_CONTEXT.board, target, READ_CONTEXT.timestamp)
  }

  // handle terrain put
  if (!boardelementisobject(kindelement)) {
    memorywritefromkind(READ_CONTEXT.board, kind, dir.destpt, id)
  }

  // handle object put
  if (boardelementisobject(kindelement)) {
    // validate placement works
    const blocked = boardcheckblockedobject(
      READ_CONTEXT.board,
      kindcollision,
      dir.destpt,
    )

    // write new element
    if (!ispresent(blocked)) {
      const element = memorywritefromkind(
        READ_CONTEXT.board,
        kind,
        dir.destpt,
        id,
      )
      if (ispresent(element) && ispresent(arg)) {
        element.arg = arg
      }
    }
  }

  return 0
}

function commanddupe(_: any, words: WORD[], arg?: WORD): 0 | 1 {
  if (!ispresent(READ_CONTEXT.book) || !ispresent(READ_CONTEXT.board)) {
    return 1
  }

  // duplicate target at dir, in the direction of the given dir
  const [dir, dupedir] = readargs(words, 0, [ARG_TYPE.DIR, ARG_TYPE.DIR])
  const maybetarget = boardelementread(READ_CONTEXT.board, dir.destpt)
  if (ispresent(maybetarget) && ispresent(maybetarget.kind)) {
    const collision = memoryelementstatread(maybetarget, 'collision')
    const blocked = boardcheckblockedobject(
      READ_CONTEXT.board,
      collision,
      dupedir.destpt,
    )
    if (ispresent(blocked)) {
      return 1
    }
    const element = memorywritefromkind(
      READ_CONTEXT.board,
      [maybetarget.kind],
      dupedir.destpt,
    )
    if (!ispresent(element)) {
      return 1
    }
    mapelementcopy(element, maybetarget)
  } else {
    return 1
  }

  return 0
}

const p1 = { x: 0, y: 0 }
const p2 = { x: BOARD_WIDTH - 1, y: BOARD_HEIGHT - 1 }
const targetset = 'all'

export const BOARD_FIRMWARE = createfirmware()
  .command('build', (chip, words) => {
    if (
      !ispresent(READ_CONTEXT.book) ||
      !ispresent(READ_CONTEXT.board) ||
      !ispresent(READ_CONTEXT.element)
    ) {
      return 0
    }

    // creates a new board from an existing one or blank, and writes the id to the given stat
    const [stat, maybesource] = readargs(words, 0, [
      ARG_TYPE.NAME,
      ARG_TYPE.MAYBE_STRING,
    ])

    const createdboard = createboard()
    if (ispresent(createdboard)) {
      // attempt to clone existing board
      if (isstring(maybesource)) {
        const sourceboard = memoryboardread(maybesource)
        if (ispresent(sourceboard)) {
          boardcopy(sourceboard.id, createdboard.id, p1, p2, targetset)
        }
      }

      // update stat with created board id
      // todo, how do we write to board exit stats ??
      chip.set(stat, createdboard.id)
    }

    return 0
  })
  .command('goto', (_, words) => {
    if (!ispresent(READ_CONTEXT.book) || !ispresent(READ_CONTEXT.board)) {
      return 0
    }

    // teleport player to a board with given stat
    const [stat, ii] = readargs(words, 0, [ARG_TYPE.STRING])
    const [maybex, maybey] = readargs(words, ii, [
      ARG_TYPE.MAYBE_NUMBER,
      ARG_TYPE.MAYBE_NUMBER,
    ])

    const targetboard = memoryboardread(stat)
    if (!ispresent(targetboard)) {
      return 0
    }

    // read entry pt
    const destpt: PT = {
      x: maybex ?? targetboard.startx ?? Math.round(BOARD_WIDTH * 0.5),
      y: maybey ?? targetboard.starty ?? Math.round(BOARD_HEIGHT * 0.5),
    }

    const display = bookelementdisplayread(READ_CONTEXT.element)
    if (display.name !== 'player') {
      const color = memoryelementstatread(READ_CONTEXT.element, 'color')
      const bg = memoryelementstatread(READ_CONTEXT.element, 'bg')
      const findcolor = mapcolortostrcolor(color, bg)
      const gotoelements = listelementsbykind(targetboard, [
        display.name,
        findcolor,
      ])

      // pick the first
      const [gotoelement] = gotoelements.sort((a, b) => {
        const ay = a.y ?? 10000
        const by = b.y ?? 10000
        const ydelta = ay - by
        if (ydelta !== 0) {
          return ydelta
        }
        const ax = a.x ?? 10000
        const bx = b.x ?? 10000
        return ax - bx
      })

      // got a match
      if (
        ispresent(gotoelement) &&
        isnumber(gotoelement.x) &&
        isnumber(gotoelement.y)
      ) {
        destpt.x = gotoelement.x
        destpt.y = gotoelement.y
      }
    }

    // yolo
    bookplayermovetoboard(
      READ_CONTEXT.book,
      READ_CONTEXT.elementfocus,
      targetboard.id,
      destpt,
      true,
    )

    return 0
  })
  .command('transport', (_, words) => {
    if (
      !ispresent(READ_CONTEXT.book) ||
      !ispresent(READ_CONTEXT.board) ||
      !ispresent(READ_CONTEXT.element)
    ) {
      return 0
    }

    const [target] = readargs(words, 0, [ARG_TYPE.STRING])
    const maybeobject = boardobjectread(READ_CONTEXT.board, target)
    if (
      ispresent(READ_CONTEXT.element?.x) &&
      ispresent(READ_CONTEXT.element.y) &&
      ispresent(maybeobject?.x) &&
      ispresent(maybeobject.y)
    ) {
      let placing = true
      const scan: PT = {
        x: READ_CONTEXT.element.x,
        y: READ_CONTEXT.element.y,
      }
      const deltax = scan.x - maybeobject.x
      const deltay = scan.y - maybeobject.y
      if (
        memoryelementstatread(READ_CONTEXT.element, 'shootx') !== deltax ||
        memoryelementstatread(READ_CONTEXT.element, 'shooty') !== deltay
      ) {
        // transporters are one direction
        return 0
      }
      while (placing) {
        scan.x += deltax
        scan.y += deltay
        // scan until board edge
        if (
          scan.x < 0 &&
          scan.x >= BOARD_WIDTH &&
          scan.y < 0 &&
          scan.y >= BOARD_HEIGHT
        ) {
          break
        }
        // scan until we find an opposite transporter
        const maybetransporter = boardelementread(READ_CONTEXT.board, scan)
        if (
          maybetransporter?.kind === READ_CONTEXT.element.kind &&
          memoryelementstatread(maybetransporter, 'shootx') === -deltax &&
          memoryelementstatread(maybetransporter, 'shooty') === -deltay
        ) {
          // if we can move the object here, we're done!
          if (
            memorymoveobject(
              READ_CONTEXT.book,
              READ_CONTEXT.board,
              maybeobject,
              {
                x: scan.x + deltax,
                y: scan.y + deltay,
              },
            )
          ) {
            placing = false
          }
        }
      }
    }

    return 0
  })
  .command('shove', (_, words) => {
    if (!ispresent(READ_CONTEXT.book) || !ispresent(READ_CONTEXT.board)) {
      return 0
    }
    // shove target at dir, in the direction of the given dir
    const [dir, movedir] = readargs(words, 0, [ARG_TYPE.DIR, ARG_TYPE.DIR])
    const maybetarget = boardelementread(READ_CONTEXT.board, dir.destpt)
    if (
      boardelementisobject(maybetarget) &&
      !!memoryelementstatread(maybetarget, 'pushable')
    ) {
      const shovex = dir.destpt.x + (movedir.destpt.x - movedir.startpt.x)
      const shovey = dir.destpt.y + (movedir.destpt.y - movedir.startpt.y)
      memorymoveobject(READ_CONTEXT.book, READ_CONTEXT.board, maybetarget, {
        x: shovex,
        y: shovey,
      })
    }
    return 0
  })
  .command('duplicate', commanddupe)
  .command('write', (_, words) => {
    if (!ispresent(READ_CONTEXT.book) || !ispresent(READ_CONTEXT.board)) {
      return 0
    }

    const [dir, strcolor, ii] = readargs(words, 0, [
      ARG_TYPE.DIR,
      ARG_TYPE.COLOR,
    ])
    const text = words.slice(ii).map(maptostring).join(' ')
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
    const last = measuredwidth - 1

    const heading = dirfrompts(dir.startpt, dir.destpt)
    switch (heading) {
      case DIR.EAST:
        for (let i = 0; i < measuredwidth; ++i) {
          // create new terrain element
          boardsetterrain(READ_CONTEXT.board, {
            x: dir.destpt.x + i,
            y: dir.destpt.y,
            name: 'text',
            char: context.char[i],
            color: context.color[i],
            bg: context.bg[i],
          })
        }
        break
      case DIR.WEST:
        for (let i = 0; i < measuredwidth; ++i) {
          // create new terrain element
          boardsetterrain(READ_CONTEXT.board, {
            x: dir.destpt.x + i - last,
            y: dir.destpt.y,
            name: 'text',
            char: context.char[i],
            color: context.color[i],
            bg: context.bg[i],
          })
        }
        break
      case DIR.NORTH:
        for (let i = 0; i < measuredwidth; ++i) {
          // create new terrain element
          boardsetterrain(READ_CONTEXT.board, {
            x: dir.destpt.x,
            y: dir.destpt.y + i - last,
            name: 'text',
            char: context.char[i],
            color: context.color[i],
            bg: context.bg[i],
          })
        }
        break
      case DIR.SOUTH:
        for (let i = 0; i < measuredwidth; ++i) {
          // create new terrain element
          boardsetterrain(READ_CONTEXT.board, {
            x: dir.destpt.x,
            y: dir.destpt.y + i,
            name: 'text',
            char: context.char[i],
            color: context.color[i],
            bg: context.bg[i],
          })
        }
        break
    }
    return 0
  })
  .command('change', (_, words) => {
    if (!ispresent(READ_CONTEXT.book) || !ispresent(READ_CONTEXT.board)) {
      return 0
    }

    // read
    const [target, into] = readargs(words, 0, [ARG_TYPE.KIND, ARG_TYPE.KIND])

    // begin filtering
    const targetname = readstrkindname(target) ?? ''
    if (targetname === 'empty') {
      // empty into something becomes a put
      listptsbyempty(READ_CONTEXT.board).forEach((pt) => {
        memorywritefromkind(READ_CONTEXT.board, into, pt)
      })
    }

    // modify attrs
    const intoname = readstrkindname(into)
    const intocolor = readstrkindcolor(into)
    const intobg = readstrkindbg(into)
    listelementsbykind(READ_CONTEXT.board, target).forEach((element) => {
      // modify existing elements
      if (ispresent(intocolor)) {
        element.color = intocolor
      }
      if (ispresent(intobg)) {
        element.bg = intobg
      }
      const display = bookelementdisplayread(element)
      if (display.name !== intoname) {
        const newcolor = memoryelementstatread(element, 'color')
        const newbg = memoryelementstatread(element, 'bg')
        // erase element
        boardsafedelete(READ_CONTEXT.board, element, READ_CONTEXT.timestamp)
        // create new element
        if (intoname !== 'empty') {
          const pt = { x: element.x ?? 0, y: element.y ?? 0 }
          const newelement = memorywritefromkind(READ_CONTEXT.board, into, pt)
          if (ispresent(newelement)) {
            newelement.color = newcolor
            newelement.bg = newbg
          } else {
            // throw error
          }
        }
      }
    })

    return 0
  })
  .command('put', (_, words) => {
    return commandput(words)
  })
  .command('putwith', (_, words) => {
    const [arg, ii] = readargs(words, 0, [ARG_TYPE.ANY])
    return commandput(words.slice(ii), undefined, arg)
  })
  .command('oneof', (_, words) => {
    const [mark, ii] = readargs(words, 0, [ARG_TYPE.ANY])

    // if there is already an object with mark id, bail
    if (
      ispresent(READ_CONTEXT.board) &&
      boardobjectread(READ_CONTEXT.board, mark)
    ) {
      return 0
    }

    return commandput(words.slice(ii), mark)
  })
  .command('oneofwith', (_, words) => {
    const [arg, mark, ii] = readargs(words, 0, [ARG_TYPE.ANY, ARG_TYPE.ANY])

    // if there is already an object with mark id, bail
    if (
      ispresent(READ_CONTEXT.board) &&
      boardobjectread(READ_CONTEXT.board, mark)
    ) {
      return 0
    }

    return commandput(words.slice(ii), mark, arg)
  })
  .command('shoot', commandshoot)
  .command('shootwith', (chip, words) => {
    const [arg, ii] = readargs(words, 0, [ARG_TYPE.ANY])
    return commandshoot(chip, words.slice(ii), arg)
  })
  .command('throwstar', (chip, words) => {
    return commandshoot(chip, [...words, 'star'])
  })
  .command('throwstarwith', (chip, words) => {
    const [arg, ii] = readargs(words, 0, [ARG_TYPE.ANY])
    return commandshoot(chip, [...words.slice(ii), 'star'], arg)
  })
