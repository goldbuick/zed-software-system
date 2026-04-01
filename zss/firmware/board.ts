import { objectKeys } from 'ts-extras'
import { CHIP } from 'zss/chip'
import { boardcopy, mapelementcopy } from 'zss/feature/boardcopy'
import { createfirmware } from 'zss/firmware'
import { celltorendervalue } from 'zss/gadget/display/cellvalue'
import { createsid, ispid } from 'zss/mapping/guid'
import { clamp } from 'zss/mapping/number'
import { deepcopy, isnumber, ispresent, isstring } from 'zss/mapping/types'
import {
  memoryreadelement,
  memoryreadobject,
  memoryreadobjects,
} from 'zss/memory/boardaccess'
import {
  memoryapplyboardelementcolor,
  memoryboardelementisobject,
} from 'zss/memory/boardelement'
import {
  memorysafedeleteelement,
  memorywriteterrain,
} from 'zss/memory/boardlifecycle'
import {
  memorycheckblockedboardobject,
  memorymoveobject,
} from 'zss/memory/boardmovement'
import {
  memoryinitboard,
  memoryreadboardbyaddress,
  memoryreadboardbyevaldir,
  memoryreadelementkind,
  memoryreadelementstat,
  memorywritebullet,
  memorywriteelementfromkind,
} from 'zss/memory/boards'
import { memoryreadelementdisplay } from 'zss/memory/bookoperations'
import { memoryensuresoftwarecodepage } from 'zss/memory/books'
import { memoryreadcodepagedata } from 'zss/memory/codepageoperations'
import { memorymoveplayertoboard } from 'zss/memory/playermanagement'
import { memorytickobject } from 'zss/memory/runtime'
import {
  memorylistboardelementsbykind,
  memorylistboardptsbyempty,
} from 'zss/memory/spatialqueries'
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  CODE_PAGE_TYPE,
  MEMORY_LABEL,
} from 'zss/memory/types'
import { mapcolortostrcolor, mapstrcolortoattributes } from 'zss/words/color'
import { dirfrompts, ispt, ptapplydir } from 'zss/words/dir'
import {
  readstrkindbg,
  readstrkindcolor,
  readstrkindname,
  strkindtostr,
} from 'zss/words/kind'
import { READ_CONTEXT, readargs, readargsuntilend } from 'zss/words/reader'
import {
  createwritetextcontext,
  tokenizeandmeasuretextformat,
  tokenizeandwritetextformat,
} from 'zss/words/textformat'
import {
  ARG_TYPE,
  COLLISION,
  COLOR,
  DIR,
  NAME,
  PT,
  WORD,
} from 'zss/words/types'

function commandshoot(chip: CHIP, words: WORD[], arg?: WORD): 0 | 1 {
  // invalid data
  if (
    !ispresent(READ_CONTEXT.element?.x) ||
    !ispresent(READ_CONTEXT.element.y)
  ) {
    return 0
  }

  // do limit check for players
  if (READ_CONTEXT.elementisplayer) {
    const maxplayershots = READ_CONTEXT.board?.maxplayershots ?? 0
    if (maxplayershots > 0) {
      const bulletcount = memoryreadobjects(READ_CONTEXT.board).filter(
        (obj) => {
          return (
            !obj.removed &&
            ispid(obj.party) &&
            memoryreadelementstat(obj, 'collision') === COLLISION.ISBULLET
          )
        },
      ).length
      if (bulletcount >= maxplayershots) {
        chip.set('didfail', 1)
        // yield after shoot
        chip.yield()
        return 0
      }
    }
  }

  // read direction + what to shoot
  const [dir, kind] = readargs(words, 0, [ARG_TYPE.DIR, ARG_TYPE.MAYBE_KIND])

  // handle player case
  const [maybename] = kind ?? []
  if (NAME(maybename) === 'player') {
    // NOT ALLOWED
    chip.set('didfail', 1)
    // yield after shoot
    chip.yield()
    return 0
  }

  // track shoot direction
  READ_CONTEXT.element.shootx = clamp(dir.destpt.x - dir.startpt.x, -1, 1)
  READ_CONTEXT.element.shooty = clamp(dir.destpt.y - dir.startpt.y, -1, 1)

  // read board by eval dir
  const board = memoryreadboardbyevaldir(dir, READ_CONTEXT.board)

  // write new element
  const bulletkind = kind ?? ['bullet']
  const bullet = memorywritebullet(board, bulletkind, {
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
    bullet.party = READ_CONTEXT.element.party ?? READ_CONTEXT.element.id ?? ''
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
    const kind = memoryreadelementkind(bullet)
    const code = bullet.code ?? kind?.code ?? ''
    // bullets get one immediate tick
    memorytickobject(READ_CONTEXT.book, board, bullet, code)
  }

  // track if we did shoot
  chip.set('didfail', ispresent(bullet) ? 0 : 1)

  // yield after shoot
  chip.yield()
  return 0
}

function commandput(chip: CHIP, words: WORD[], id?: string, arg?: WORD): 0 | 1 {
  // invalid data
  if (
    !ispt(READ_CONTEXT.element) ||
    !ispresent(READ_CONTEXT.book) ||
    !ispresent(READ_CONTEXT.board) ||
    !ispresent(READ_CONTEXT.element)
  ) {
    chip.set('didfail', 1)
    return 0
  }

  // read
  const [dir, kind] = readargs(words, 0, [ARG_TYPE.DIR, ARG_TYPE.KIND])

  // handle player case
  const [maybename] = kind
  if (NAME(maybename) === 'player') {
    // NOT ALLOWED
    chip.set('didfail', 1)
    return 0
  }

  // list of target points to put
  if (dir.targets.length) {
    const dirstr = DIR[dir.layer]
    const kindstr = strkindtostr(kind)
    let anyfailed = false
    for (let i = 0; i < dir.targets.length; ++i) {
      const target = dir.targets[i]
      commandput(
        chip,
        [
          ...(dir.layer !== DIR.MID ? [dirstr] : []),
          'at',
          target.x,
          target.y,
          ...kindstr,
        ],
        id,
        arg,
      )
      if (chip.get('didfail') === 1) {
        anyfailed = true
      }
    }
    chip.set('didfail', anyfailed ? 1 : 0)
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
    chip.set('didfail', 1)
    return 0
  }

  // read board by eval dir
  const board = memoryreadboardbyevaldir(dir, READ_CONTEXT.board)

  // get kind we're putting
  const [kindname] = kind
  const from: PT = {
    x: READ_CONTEXT.element?.x ?? 0,
    y: READ_CONTEXT.element?.y ?? 0,
  }

  // get kind's collision type
  const kindelement = memoryreadelementkind({ kind: kindname })
  const kindcollision = memoryreadelementstat(kindelement, 'collision')
  if (kindcollision === COLLISION.ISGHOST) {
    // ghost elements have no collision
    memorywriteelementfromkind(board, kind, dir.destpt, id)
    chip.set('didfail', 0)
    return 0
  }

  // check if we are blocked by a pushable object element
  let target = memoryreadelement(board, dir.destpt)
  if (
    memoryboardelementisobject(target) &&
    memoryreadelementstat(target, 'pushable')
  ) {
    // attempt to shove it away
    const pivot = deepcopy(dir.destpt)
    const pt = ptapplydir(pivot, dirfrompts(from, pivot))
    memorymoveobject(READ_CONTEXT.book, board, target, pt)
    // grab new target
    target = memoryreadelement(board, dir.destpt)
  }

  // handle put empty case
  if (kindname === 'empty') {
    memorysafedeleteelement(board, target, READ_CONTEXT.timestamp)
    chip.set('didfail', 0)
    return 0
  }

  // check for type match
  if (target?.kind === kindname) {
    // apply color and return
    const [, maybecolor] = kind
    memoryapplyboardelementcolor(target, maybecolor)
    chip.set('didfail', 0)
    return 0
  }

  // invoke safe delete
  if (memoryboardelementisobject(target)) {
    memorysafedeleteelement(board, target, READ_CONTEXT.timestamp)
  }

  // success !
  chip.set('didfail', 0)

  // handle terrain put
  if (!memoryboardelementisobject(kindelement)) {
    memorywriteelementfromkind(board, kind, dir.destpt, id)
  }

  // handle object put
  if (memoryboardelementisobject(kindelement)) {
    const element = memorywriteelementfromkind(board, kind, dir.destpt, id)
    // write arg info
    if (ispresent(element) && ispresent(arg)) {
      element.arg = arg
    }
  }

  return 0
}

function commanddupe(chip: CHIP, words: WORD[], arg?: WORD): 0 | 1 {
  if (!ispresent(READ_CONTEXT.book) || !ispresent(READ_CONTEXT.board)) {
    chip.set('didfail', 1)
    return 0
  }

  // duplicate target at dir, in the direction of the given dir
  const [dir, dupedir] = readargs(words, 0, [ARG_TYPE.DIR, ARG_TYPE.DIR])

  // read board by eval dir
  const dirboard = memoryreadboardbyevaldir(dir, READ_CONTEXT.board)
  const dupedirboard = memoryreadboardbyevaldir(dupedir, READ_CONTEXT.board)

  const maybetarget = memoryreadelement(dirboard, dir.destpt)
  if (ispresent(maybetarget) && ispresent(maybetarget.kind)) {
    // handle player case
    const [maybename] = maybetarget.kind
    if (NAME(maybename) === 'player') {
      // NOT ALLOWED
      chip.set('didfail', 1)
      return 0
    }

    const collision = memoryreadelementstat(maybetarget, 'collision')
    const blocked = memorycheckblockedboardobject(
      dupedirboard,
      collision,
      dupedir.destpt,
    )
    if (ispresent(blocked)) {
      chip.set('didfail', 1)
      return 0
    }
    const element = memorywriteelementfromkind(
      dupedirboard,
      [maybetarget.kind],
      dupedir.destpt,
    )
    if (!ispresent(element)) {
      chip.set('didfail', 1)
      return 0
    }
    mapelementcopy(element, maybetarget)
    if (ispresent(arg)) {
      element.arg = arg
    }
  } else {
    chip.set('didfail', 1)
    return 0
  }

  // success !
  chip.set('didfail', 0)
  return 0
}

const p1 = { x: 0, y: 0 }
const p2 = { x: BOARD_WIDTH - 1, y: BOARD_HEIGHT - 1 }
const targetset = 'all'

export const BOARD_FIRMWARE = createfirmware()
  .command(
    'build',
    [
      ARG_TYPE.NAME,
      ARG_TYPE.MAYBE_STRING,
      'create board and link to stat. optional source board.',
    ],
    (chip, words) => {
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

      const [codepage] = memoryensuresoftwarecodepage(
        MEMORY_LABEL.TEMP,
        createsid(),
        CODE_PAGE_TYPE.BOARD,
      )
      if (!ispresent(codepage)) {
        return 0
      }

      const createdboard =
        memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(codepage)
      if (!ispresent(createdboard)) {
        return 0
      }

      // attempt to clone existing board
      if (isstring(maybesource)) {
        const sourceboard = memoryreadboardbyaddress(maybesource)
        if (ispresent(sourceboard)) {
          boardcopy(sourceboard.id, createdboard.id, p1, p2, targetset)
          // make sure to copy board stats as well
          createdboard.isdark = sourceboard.isdark
          createdboard.startx = sourceboard.startx
          createdboard.starty = sourceboard.starty
          createdboard.over = sourceboard.over
          createdboard.under = sourceboard.under
          createdboard.camera = sourceboard.camera
          createdboard.graphics = sourceboard.graphics
          createdboard.facing = sourceboard.facing
          createdboard.charset = sourceboard.charset
          createdboard.palette = sourceboard.palette
          createdboard.timelimit = sourceboard.timelimit
          createdboard.restartonzap = sourceboard.restartonzap
          createdboard.maxplayershots = sourceboard.maxplayershots
          createdboard.b1 = sourceboard.b1
          createdboard.b2 = sourceboard.b2
          createdboard.b3 = sourceboard.b3
          createdboard.b4 = sourceboard.b4
          createdboard.b5 = sourceboard.b5
          createdboard.b6 = sourceboard.b6
          createdboard.b7 = sourceboard.b7
          createdboard.b8 = sourceboard.b8
          createdboard.b9 = sourceboard.b9
          createdboard.b10 = sourceboard.b10
          // when building out border boards, make sure to link back
          // to current board
          switch (NAME(stat)) {
            case 'exitwest':
              createdboard.exiteast = READ_CONTEXT.board.id
              break
            case 'exiteast':
              createdboard.exitwest = READ_CONTEXT.board.id
              break
            case 'exitnorth':
              createdboard.exitsouth = READ_CONTEXT.board.id
              break
            case 'exitsouth':
              createdboard.exitnorth = READ_CONTEXT.board.id
              break
            default:
              break
          }
        }
      }

      // update stat with created board id
      chip.set(stat, createdboard.id)
      return 0
    },
  )
  .command(
    'goto',
    [
      ARG_TYPE.STRING,
      ARG_TYPE.MAYBE_NUMBER,
      ARG_TYPE.MAYBE_NUMBER,
      'player to board by name or address with optional x, y',
    ],
    (_, words) => {
      if (!ispresent(READ_CONTEXT.book) || !ispresent(READ_CONTEXT.board)) {
        return 0
      }

      // teleport player to a board with given stat
      const [stat, ii] = readargs(words, 0, [ARG_TYPE.STRING])
      const [maybex, maybey] = readargs(words, ii, [
        ARG_TYPE.MAYBE_NUMBER,
        ARG_TYPE.MAYBE_NUMBER,
      ])

      const targetboard = memoryreadboardbyaddress(stat)
      if (!ispresent(targetboard)) {
        return 0
      }

      // init board kinds
      memoryinitboard(targetboard)

      // read entry pt
      const destpt: PT = {
        x: maybex ?? targetboard.startx ?? Math.round(BOARD_WIDTH * 0.5),
        y: maybey ?? targetboard.starty ?? Math.round(BOARD_HEIGHT * 0.5),
      }

      const display = memoryreadelementdisplay(READ_CONTEXT.element)
      if (display.name !== 'player') {
        const color = memoryreadelementstat(READ_CONTEXT.element, 'color')
        const bg = memoryreadelementstat(READ_CONTEXT.element, 'bg')
        const findcolor = mapcolortostrcolor(color, bg)
        const gotoelements = memorylistboardelementsbykind(targetboard, [
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
      memorymoveplayertoboard(
        READ_CONTEXT.book,
        READ_CONTEXT.elementfocus,
        targetboard.id,
        destpt,
      )

      return 0
    },
  )
  .command(
    'transport',
    [ARG_TYPE.STRING, 'element across board with transporter logic'],
    (_, words) => {
      if (
        !ispresent(READ_CONTEXT.book) ||
        !ispresent(READ_CONTEXT.board) ||
        !ispresent(READ_CONTEXT.element)
      ) {
        return 0
      }

      const [target] = readargs(words, 0, [ARG_TYPE.STRING])
      const maybeobject = memoryreadobject(READ_CONTEXT.board, target)
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
          memoryreadelementstat(READ_CONTEXT.element, 'shootx') !== deltax ||
          memoryreadelementstat(READ_CONTEXT.element, 'shooty') !== deltay
        ) {
          // transporters are one direction
          return 0
        }
        while (placing) {
          scan.x += deltax
          scan.y += deltay
          // scan until board edge
          if (
            scan.x < 0 ||
            scan.x >= BOARD_WIDTH ||
            scan.y < 0 ||
            scan.y >= BOARD_HEIGHT
          ) {
            break
          }
          // scan until we find an opposite transporter
          const maybetransporter = memoryreadelement(READ_CONTEXT.board, scan)
          if (
            maybetransporter?.kind === READ_CONTEXT.element.kind &&
            memoryreadelementstat(maybetransporter, 'shootx') === -deltax &&
            memoryreadelementstat(maybetransporter, 'shooty') === -deltay
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
        if (placing) {
          memorymoveobject(READ_CONTEXT.book, READ_CONTEXT.board, maybeobject, {
            x: READ_CONTEXT.element.x + deltax,
            y: READ_CONTEXT.element.y + deltay,
          })
        }
      }

      return 0
    },
  )
  .command(
    'shove',
    [ARG_TYPE.DIR, ARG_TYPE.DIR, 'target object in direction'],
    (_, words) => {
      if (!ispresent(READ_CONTEXT.book) || !ispresent(READ_CONTEXT.board)) {
        return 0
      }
      // shove target at dir, in the direction of the given dir
      const [targetdir, ii] = readargs(words, 0, [ARG_TYPE.DIR])
      const targetboard = memoryreadboardbyevaldir(
        targetdir,
        READ_CONTEXT.board,
      )
      const maybetarget = memoryreadelement(targetboard, targetdir.destpt)
      if (memoryboardelementisobject(maybetarget)) {
        // temp override context
        const OLD_CONTEXT: typeof READ_CONTEXT = { ...READ_CONTEXT }
        READ_CONTEXT.element = maybetarget
        READ_CONTEXT.elementid = maybetarget?.id ?? ''
        READ_CONTEXT.elementisplayer = ispid(READ_CONTEXT.elementid)
        // eval shovedir
        const [shovedir] = readargs(words, ii, [ARG_TYPE.DIR])
        memorymoveobject(READ_CONTEXT.book, targetboard, maybetarget, {
          x: shovedir.destpt.x,
          y: shovedir.destpt.y,
        })
        // restore context
        objectKeys(OLD_CONTEXT).forEach((key) => {
          // @ts-expect-error dont bother me
          READ_CONTEXT[key] = OLD_CONTEXT[key]
        })
      }
      return 0
    },
  )
  .command(
    'push',
    [ARG_TYPE.DIR, ARG_TYPE.DIR, 'target object in direction ONLY if pushable'],
    (_, words) => {
      if (!ispresent(READ_CONTEXT.book) || !ispresent(READ_CONTEXT.board)) {
        return 0
      }
      // shove target at dir, in the direction of the given dir
      const [targetdir, ii] = readargs(words, 0, [ARG_TYPE.DIR])
      const targetboard = memoryreadboardbyevaldir(
        targetdir,
        READ_CONTEXT.board,
      )
      const maybetarget = memoryreadelement(targetboard, targetdir.destpt)
      if (
        memoryboardelementisobject(maybetarget) &&
        memoryreadelementstat(maybetarget, 'pushable')
      ) {
        // temp override context
        const OLD_CONTEXT: typeof READ_CONTEXT = { ...READ_CONTEXT }
        READ_CONTEXT.element = maybetarget
        READ_CONTEXT.elementid = maybetarget?.id ?? ''
        READ_CONTEXT.elementisplayer = ispid(READ_CONTEXT.elementid)
        // eval shovedir
        const [shovedir] = readargs(words, ii, [ARG_TYPE.DIR])
        memorymoveobject(READ_CONTEXT.book, targetboard, maybetarget, {
          x: shovedir.destpt.x,
          y: shovedir.destpt.y,
        })
        // restore context
        objectKeys(OLD_CONTEXT).forEach((key) => {
          // @ts-expect-error dont bother me
          READ_CONTEXT[key] = OLD_CONTEXT[key]
        })
      }
      return 0
    },
  )
  .command(
    'duplicate',
    [ARG_TYPE.DIR, ARG_TYPE.DIR, 'element at direction in given direction'],
    commanddupe,
  )
  .command(
    'duplicatewith',
    [ARG_TYPE.ANY, ARG_TYPE.DIR, ARG_TYPE.DIR, 'element with argument'],
    (chip, words) => {
      const [arg, ii] = readargs(words, 0, [ARG_TYPE.ANY])
      return commanddupe(chip, words.slice(ii), arg)
    },
  )
  .command(
    'dupe',
    [ARG_TYPE.DIR, ARG_TYPE.DIR, 'element at direction in given direction'],
    commanddupe,
  )
  .command(
    'dupewith',
    [ARG_TYPE.ANY, ARG_TYPE.DIR, ARG_TYPE.DIR, 'element with argument'],
    (chip, words) => {
      const [arg, ii] = readargs(words, 0, [ARG_TYPE.ANY])
      return commanddupe(chip, words.slice(ii), arg)
    },
  )
  .command(
    'write',
    [ARG_TYPE.DIR, ARG_TYPE.COLOR, 'text to board at direction'],
    (chip, words) => {
      if (!ispresent(READ_CONTEXT.book) || !ispresent(READ_CONTEXT.board)) {
        chip.set('didfail', 1)
        return 0
      }

      const [dir, strcolor, ii] = readargs(words, 0, [
        ARG_TYPE.DIR,
        ARG_TYPE.COLOR,
      ])

      // read board by eval dir
      const board = memoryreadboardbyevaldir(dir, READ_CONTEXT.board)

      const [textwords] = readargsuntilend(words, ii, ARG_TYPE.NUMBER_OR_NAME)
      const text = textwords.join(' ')
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
            memorywriteterrain(board, {
              x: dir.destpt.x + i,
              y: dir.destpt.y,
              name: 'text',
              char: celltorendervalue(context.char[i]),
              color: context.color[i],
              bg: context.bg[i],
            })
          }
          break
        case DIR.WEST:
          for (let i = 0; i < measuredwidth; ++i) {
            // create new terrain element
            memorywriteterrain(board, {
              x: dir.destpt.x + i - last,
              y: dir.destpt.y,
              name: 'text',
              char: celltorendervalue(context.char[i]),
              color: context.color[i],
              bg: context.bg[i],
            })
          }
          break
        case DIR.NORTH:
          for (let i = 0; i < measuredwidth; ++i) {
            // create new terrain element
            memorywriteterrain(board, {
              x: dir.destpt.x,
              y: dir.destpt.y + i - last,
              name: 'text',
              char: celltorendervalue(context.char[i]),
              color: context.color[i],
              bg: context.bg[i],
            })
          }
          break
        case DIR.SOUTH:
          for (let i = 0; i < measuredwidth; ++i) {
            // create new terrain element
            memorywriteterrain(board, {
              x: dir.destpt.x,
              y: dir.destpt.y + i,
              name: 'text',
              char: celltorendervalue(context.char[i]),
              color: context.color[i],
              bg: context.bg[i],
            })
          }
          break
      }
      chip.set('didfail', 0)
      return 0
    },
  )
  .command(
    'change',
    [ARG_TYPE.KIND, ARG_TYPE.KIND, 'elements of one kind to another'],
    (chip, words) => {
      if (!ispresent(READ_CONTEXT.book) || !ispresent(READ_CONTEXT.board)) {
        chip.set('didfail', 1)
        return 0
      }

      // read
      const [target, into] = readargs(words, 0, [ARG_TYPE.KIND, ARG_TYPE.KIND])

      // handle player case
      const [maybetargetname] = target
      const [maybeintoname] = into
      if (
        NAME(maybetargetname) === 'player' ||
        NAME(maybeintoname) === 'player'
      ) {
        // NOT ALLOWED
        chip.set('didfail', 1)
        return 0
      }

      // default to failure
      chip.set('didfail', 1)

      // begin filtering
      const targetname = readstrkindname(target) ?? ''
      if (targetname === 'empty') {
        // empty into something becomes a put
        memorylistboardptsbyempty(READ_CONTEXT.board).forEach((pt) => {
          memorywriteelementfromkind(READ_CONTEXT.board, into, pt)
        })
      }

      // modify attrs
      const intoname = readstrkindname(into)
      const intocolor = readstrkindcolor(into)
      const intobg = readstrkindbg(into)
      memorylistboardelementsbykind(READ_CONTEXT.board, target).forEach(
        (element) => {
          // modify existing elements
          if (ispresent(intocolor)) {
            element.color = intocolor
            chip.set('didfail', 0)
          }
          if (ispresent(intobg)) {
            element.bg = intobg
            chip.set('didfail', 0)
          }
          const display = memoryreadelementdisplay(element)
          if (display.name !== intoname) {
            const newcolor = memoryreadelementstat(element, 'color')
            const newbg = memoryreadelementstat(element, 'bg')
            // erase element
            memorysafedeleteelement(
              READ_CONTEXT.board,
              element,
              READ_CONTEXT.timestamp,
            )
            // create new element
            if (intoname !== 'empty') {
              const pt = { x: element.x ?? 0, y: element.y ?? 0 }
              const newelement = memorywriteelementfromkind(
                READ_CONTEXT.board,
                into,
                pt,
              )
              if (ispresent(newelement)) {
                chip.set('didfail', 0)
                newelement.color = newcolor
                newelement.bg = newbg
              } else {
                chip.set('didfail', 1)
              }
            } else {
              chip.set('didfail', 0)
            }
          }
        },
      )

      return 0
    },
  )
  .command(
    'put',
    [ARG_TYPE.DIR, ARG_TYPE.KIND, 'element in direction'],
    commandput,
  )
  .command(
    'putwith',
    [ARG_TYPE.ANY, ARG_TYPE.DIR, ARG_TYPE.KIND, 'element with argument'],
    (chip, words) => {
      const [arg, ii] = readargs(words, 0, [ARG_TYPE.ANY])
      return commandput(chip, words.slice(ii), undefined, arg)
    },
  )
  .command(
    'oneof',
    [
      ARG_TYPE.ANY,
      ARG_TYPE.DIR,
      ARG_TYPE.KIND,
      'given id to ensure only one element of given kind is made',
    ],
    (chip, words) => {
      const [mark, ii] = readargs(words, 0, [ARG_TYPE.ANY])

      // if there is already an object with mark id, bail
      if (
        ispresent(READ_CONTEXT.board) &&
        memoryreadobject(READ_CONTEXT.board, mark)
      ) {
        chip.set('didfail', 1)
        return 0
      }

      return commandput(chip, words.slice(ii), mark)
    },
  )
  .command(
    'oneofwith',
    [
      ARG_TYPE.ANY,
      ARG_TYPE.ANY,
      ARG_TYPE.DIR,
      ARG_TYPE.KIND,
      'element with argument and oneof logic',
    ],
    (chip, words) => {
      const [arg, mark, ii] = readargs(words, 0, [ARG_TYPE.ANY, ARG_TYPE.ANY])

      // if there is already an object with mark id, bail
      if (
        ispresent(READ_CONTEXT.board) &&
        memoryreadobject(READ_CONTEXT.board, mark)
      ) {
        chip.set('didfail', 1)
        return 0
      }

      return commandput(chip, words.slice(ii), mark, arg)
    },
  )
  .command(
    'shoot',
    [ARG_TYPE.DIR, ARG_TYPE.MAYBE_KIND, 'projectile, with optional kind'],
    commandshoot,
  )
  .command(
    'shootwith',
    [
      ARG_TYPE.ANY,
      ARG_TYPE.DIR,
      ARG_TYPE.MAYBE_KIND,
      'projectile with argument',
    ],
    (chip, words) => {
      const [arg, ii] = readargs(words, 0, [ARG_TYPE.ANY])
      return commandshoot(chip, words.slice(ii), arg)
    },
  )
  .command(
    'throwstar',
    [ARG_TYPE.DIR, 'star projectile, shorthand for `#shoot <dir> star`'],
    (chip, words) => {
      return commandshoot(chip, [...words, 'star'])
    },
  )
  .command(
    'throwstarwith',
    [ARG_TYPE.ANY, ARG_TYPE.DIR, 'star with argument'],
    (chip, words) => {
      const [arg, ii] = readargs(words, 0, [ARG_TYPE.ANY])
      return commandshoot(chip, [...words.slice(ii), 'star'], arg)
    },
  )
