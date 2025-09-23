import { vm_logout } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { createfirmware } from 'zss/firmware'
import {
  INPUT,
  INPUT_ALT,
  INPUT_CTRL,
  INPUT_SHIFT,
} from 'zss/gadget/data/types'
import { pick } from 'zss/mapping/array'
import { clamp } from 'zss/mapping/number'
import {
  MAYBE,
  isarray,
  isnumber,
  ispresent,
  isstring,
} from 'zss/mapping/types'
import { maptonumber, maptostring } from 'zss/mapping/value'
import {
  memoryelementstatread,
  memorymoveobject,
  memoryreadflags,
  memoryreadoperator,
  memoryresetchipafteredit,
  memoryrun,
  memorywritefromkind,
} from 'zss/memory'
import { findplayerforelement, listnamedelements } from 'zss/memory/atomics'
import {
  boardelementread,
  boardelementreadbyidorindex,
  boardsafedelete,
} from 'zss/memory/board'
import { boardelementapplycolor } from 'zss/memory/boardelement'
import {
  boardobjectnamedlookupdelete,
  boardsetlookup,
} from 'zss/memory/boardlookup'
import { bookelementdisplayread } from 'zss/memory/book'
import { BOARD_ELEMENT } from 'zss/memory/types'
import { categoryconsts } from 'zss/words/category'
import { collisionconsts } from 'zss/words/collision'
import { colorconsts, mapcolortostrcolor } from 'zss/words/color'
import { dirconsts, isstrdir } from 'zss/words/dir'
import { STR_KIND } from 'zss/words/kind'
import { ARG_TYPE, READ_CONTEXT, readargs } from 'zss/words/reader'
import { PT } from 'zss/words/types'

const INPUT_FLAG_NAMES = new Set([
  'inputmove',
  'inputalt',
  'inputctrl',
  'inputshift',
  'inputok',
  'inputcancel',
  'inputmenu',
])

const STANDARD_STAT_NAMES = new Set([
  // display
  'char',
  'color',
  'bg',
  'displaychar',
  'displaycolor',
  'displaybg',
  // interaction
  'item',
  'group',
  'party',
  'player',
  'pushable',
  'collision',
  'breakable',
  // config
  'p1',
  'p2',
  'p3',
  'p4',
  'p5',
  'p6',
  'p7',
  'p8',
  'p9',
  'p10',
  'cycle',
  'stepx',
  'stepy',
  'shootx',
  'shooty',
  'light',
  'lightdir',
  // run & with arg
  'arg',
])

const readinputmap = ['NORTH', 'SOUTH', 'WEST', 'EAST']

function readinput(
  player: string,
  graphics: MAYBE<string>,
  facing: MAYBE<number>,
) {
  const flags = memoryreadflags(player)

  // ensure we have the proper flags on player data
  if (!isnumber(flags.inputcurrent)) {
    flags.inputcurrent = 0
  }
  if (!isarray(flags.inputqueue)) {
    flags.inputqueue = []
  }

  // we've already processed input for this tick
  if (flags.inputcurrent > 0) {
    return flags
  }

  // pull from front of queue
  const [head] = flags.inputqueue as [INPUT, number][]
  const [input = INPUT.NONE, mods = 0] = head ?? [INPUT.NONE, 0]

  // clear input flags
  flags.inputmove = []
  flags.inputok = 0
  flags.inputcancel = 0
  flags.inputmenu = 0

  // set active input flag
  flags.inputalt = mods & INPUT_ALT ? 1 : 0
  flags.inputctrl = mods & INPUT_CTRL ? 1 : 0
  flags.inputshift = mods & INPUT_SHIFT ? 1 : 0
  switch (input) {
    case INPUT.MOVE_UP:
    case INPUT.MOVE_DOWN:
    case INPUT.MOVE_LEFT:
    case INPUT.MOVE_RIGHT: {
      const inputdir = readinputmap[input - INPUT.MOVE_UP]
      if (isstring(graphics) && graphics === 'fpv' && isnumber(facing)) {
        const mappedfacing = Math.round(facing / 90)
        switch (mappedfacing) {
          default:
          case 0: // north
            // no-op
            flags.inputmove = [inputdir]
            break
          case 1: // east
            switch (inputdir) {
              default:
              case 'NORTH': // forward
                flags.inputmove = ['EAST']
                break
              case 'EAST': // step right
                flags.inputmove = ['SOUTH']
                break
              case 'SOUTH': // backward
                flags.inputmove = ['WEST']
                break
              case 'WEST': // step left
                flags.inputmove = ['NORTH']
                break
            }
            break
          case 2: // south
            switch (inputdir) {
              default:
              case 'NORTH': // forward
                flags.inputmove = ['SOUTH']
                break
              case 'EAST': // step right
                flags.inputmove = ['WEST']
                break
              case 'SOUTH': // backward
                flags.inputmove = ['NORTH']
                break
              case 'WEST': // step left
                flags.inputmove = ['EAST']
                break
            }
            break
          case 3: // west
            switch (inputdir) {
              default:
              case 'NORTH': // forward
                flags.inputmove = ['WEST']
                break
              case 'EAST': // step right
                flags.inputmove = ['NORTH']
                break
              case 'SOUTH': // backward
                flags.inputmove = ['EAST']
                break
              case 'WEST': // step left
                flags.inputmove = ['SOUTH']
                break
            }
            break
        }
      } else {
        flags.inputmove = [inputdir]
      }
      break
    }

    case INPUT.OK_BUTTON:
      flags.inputok = 1
      break
    case INPUT.CANCEL_BUTTON:
      flags.inputcancel = 1
      break
    case INPUT.MENU_BUTTON:
      flags.inputmenu = 1
      break
  }

  // set active input
  flags.inputcurrent = input

  // clear used input
  flags.inputqueue = flags.inputqueue.filter((item) => {
    const [check] = item as [INPUT, number]
    return check !== INPUT.NONE && check !== input
  })

  return flags
}

function maptoconst(value: string) {
  const maybecategory = (categoryconsts as any)[value]
  if (ispresent(maybecategory)) {
    return maybecategory
  }
  const maybecollision = (collisionconsts as any)[value]
  if (ispresent(maybecollision)) {
    return maybecollision
  }
  const maybecolor = (colorconsts as any)[value]
  if (ispresent(maybecolor)) {
    return maybecolor
  }
  const maybedir = (dirconsts as any)[value]
  if (ispresent(maybedir)) {
    return maybedir
  }
  return undefined
}

function handledie() {
  boardsafedelete(
    READ_CONTEXT.board,
    READ_CONTEXT.element,
    READ_CONTEXT.timestamp,
  )

  // yoink player if item
  const isitem = !!memoryelementstatread(READ_CONTEXT.element, 'item')
  if (isitem) {
    // find focused on player
    const from: PT = {
      x: READ_CONTEXT.element?.x ?? -1,
      y: READ_CONTEXT.element?.y ?? -1,
    }
    const focus = findplayerforelement(
      READ_CONTEXT.board,
      from,
      READ_CONTEXT.elementfocus,
    )
    if (ispresent(focus)) {
      focus.x = from.x
      focus.y = from.y
    }
  }
}

export const ELEMENT_FIRMWARE = createfirmware({
  get(chip, name) {
    // check consts first (data normalization)
    const maybeconst = maptoconst(name)
    if (ispresent(maybeconst)) {
      return [true, maybeconst]
    }

    // if we are reading from input AND are a player
    if (READ_CONTEXT.elementisplayer && INPUT_FLAG_NAMES.has(name)) {
      // we need to have the context to rotate the input
      const graphics = chip.get('graphics')
      const facing = chip.get('facing')
      // pull the next input
      const value = readinput(READ_CONTEXT.elementid, graphics, facing)[name]
      return [ispresent(value), value]
    }

    // find focused on player
    const focus = findplayerforelement(
      READ_CONTEXT.board,
      { x: READ_CONTEXT.element?.x ?? -1, y: READ_CONTEXT.element?.y ?? -1 },
      READ_CONTEXT.elementfocus,
    )

    // player id
    const playerid =
      focus?.id ?? READ_CONTEXT.elementfocus ?? memoryreadoperator()

    // sender info
    const maybesender = READ_CONTEXT.element?.sender
    const sender = boardelementreadbyidorindex(
      READ_CONTEXT.board,
      isstring(maybesender) ? maybesender : '',
    )
    const senderid = sender?.id ?? ''

    // read stat
    switch (name) {
      // board stats
      case 'camera':
      case 'graphics':
      case 'facing':
        // pass-through to player flag if not defined
        if (ispresent(READ_CONTEXT.board?.[name])) {
          return [true, READ_CONTEXT.board?.[name]]
        }
        break
      // writable
      case 'isdark':
        return [true, READ_CONTEXT.board?.isdark ? 1 : 0]
      case 'startx':
        return [true, READ_CONTEXT.board?.startx ?? 0]
      case 'starty':
        return [true, READ_CONTEXT.board?.starty ?? 0]
      // board displayed over/under this one
      // uses content slot book
      case 'over':
        return [true, READ_CONTEXT.board?.over ?? '']
      case 'under':
        return [true, READ_CONTEXT.board?.under ?? '']
      // common stats
      case 'exitnorth':
        return [true, READ_CONTEXT.board?.exitnorth ?? '']
      case 'exitsouth':
        return [true, READ_CONTEXT.board?.exitsouth ?? '']
      case 'exitwest':
        return [true, READ_CONTEXT.board?.exitwest ?? '']
      case 'exiteast':
        return [true, READ_CONTEXT.board?.exiteast ?? '']
      case 'timelimit':
        return [true, READ_CONTEXT.board?.timelimit ?? 0]
      case 'restartonzap':
        return [true, READ_CONTEXT.board?.restartonzap ?? 0]
      case 'maxplayershots':
        return [true, READ_CONTEXT.board?.maxplayershots ?? 0]
      case 'b1':
        return [true, READ_CONTEXT.board?.b1 ?? 0]
      case 'b2':
        return [true, READ_CONTEXT.board?.b1 ?? 0]
      case 'b3':
        return [true, READ_CONTEXT.board?.b1 ?? 0]
      case 'b4':
        return [true, READ_CONTEXT.board?.b1 ?? 0]
      case 'b5':
        return [true, READ_CONTEXT.board?.b1 ?? 0]
      case 'b6':
        return [true, READ_CONTEXT.board?.b1 ?? 0]
      case 'b7':
        return [true, READ_CONTEXT.board?.b1 ?? 0]
      case 'b8':
        return [true, READ_CONTEXT.board?.b1 ?? 0]
      case 'b9':
        return [true, READ_CONTEXT.board?.b1 ?? 0]
      case 'b10':
        return [true, READ_CONTEXT.board?.b1 ?? 0]
      // read only
      case 'currenttick':
        return [true, READ_CONTEXT.timestamp]
      case 'boardid':
        return [true, READ_CONTEXT.board?.id ?? '']
      // env stats
      case 'playerid':
        return [true, playerid]
      case 'playerx':
        return [true, focus?.x ?? -1]
      case 'playery':
        return [true, focus?.y ?? -1]
      // object only
      case 'thisid':
        return [true, READ_CONTEXT.element?.id ?? '']
      case 'thisx':
        return [true, READ_CONTEXT.element?.x ?? -1]
      case 'thisy':
        return [true, READ_CONTEXT.element?.y ?? -1]
      case 'sender':
      case 'senderid':
        return [true, senderid]
      case 'senderx':
        return [true, sender?.x ?? -1]
      case 'sendery':
        return [true, sender?.y ?? -1]
      default: {
        // return result
        if (STANDARD_STAT_NAMES.has(name)) {
          // check standard stat names
          const maybevalue = memoryelementstatread(
            READ_CONTEXT.element,
            name as keyof BOARD_ELEMENT,
          )
          return [true, maybevalue ?? 0] // fallback to zero as default value from a stat
        }
        break
      }
    }

    // fallback to player flags
    // read value
    const value = memoryreadflags(playerid)[name]
    return [ispresent(value), value]
  },
  set(_, name, value) {
    // check player's flags
    // >>> this <<< uses focus
    const focus = findplayerforelement(
      READ_CONTEXT.board,
      { x: READ_CONTEXT.element?.x ?? -1, y: READ_CONTEXT.element?.y ?? -1 },
      READ_CONTEXT.elementfocus,
    )
    const player = focus?.id ?? READ_CONTEXT.elementfocus

    // write stat
    switch (name) {
      // board stats
      // pass-through to player flag
      case 'camera':
      case 'graphics':
        break
      case 'facing': {
        // constrain facing to 360 degrees
        if (value < 0 || value > 360) {
          value = (value + 360) % 360
        }
        break
      }
      // writable
      case 'isdark':
        if (ispresent(READ_CONTEXT.board)) {
          READ_CONTEXT.board.isdark = value ? 1 : 0
          return [true, READ_CONTEXT.board.isdark]
        }
        break
      case 'startx':
        if (ispresent(READ_CONTEXT.board)) {
          READ_CONTEXT.board.startx = maptonumber(value, 0)
          return [true, READ_CONTEXT.board.startx]
        }
        break
      case 'starty':
        if (ispresent(READ_CONTEXT.board)) {
          READ_CONTEXT.board.starty = maptonumber(value, 0)
          return [true, READ_CONTEXT.board.starty]
        }
        break
      // board displayed over/under this one
      // uses content slot book
      case 'over':
        if (ispresent(READ_CONTEXT.board)) {
          READ_CONTEXT.board.over = maptostring(value)
          return [true, READ_CONTEXT.board.over]
        }
        break
      case 'under':
        if (ispresent(READ_CONTEXT.board)) {
          return [true, (READ_CONTEXT.board.under = maptostring(value))]
        }
        break
      // common stats
      case 'exitnorth':
        if (ispresent(READ_CONTEXT.board)) {
          return [true, (READ_CONTEXT.board.exitnorth = maptostring(value))]
        }
        break
      case 'exitsouth':
        if (ispresent(READ_CONTEXT.board)) {
          return [true, (READ_CONTEXT.board.exitsouth = maptostring(value))]
        }
        break
      case 'exitwest':
        if (ispresent(READ_CONTEXT.board)) {
          return [true, (READ_CONTEXT.board.exitwest = maptostring(value))]
        }
        break
      case 'exiteast':
        if (ispresent(READ_CONTEXT.board)) {
          return [true, (READ_CONTEXT.board.exiteast = maptostring(value))]
        }
        break
      case 'timelimit':
        if (ispresent(READ_CONTEXT.board)) {
          return [true, (READ_CONTEXT.board.timelimit = maptonumber(value, 0))]
        }
        break
      case 'restartonzap':
        if (ispresent(READ_CONTEXT.board)) {
          return [true, (READ_CONTEXT.board.restartonzap = value ? 1 : 0)]
        }
        break
      case 'maxplayershots':
        if (ispresent(READ_CONTEXT.board)) {
          return [
            true,
            (READ_CONTEXT.board.maxplayershots = maptonumber(value, 0)),
          ]
        }
        break
      case 'b1':
        if (ispresent(READ_CONTEXT.board)) {
          return [true, (READ_CONTEXT.board.b1 = maptonumber(value, 0))]
        }
        break
      case 'b2':
        if (ispresent(READ_CONTEXT.board)) {
          return [true, (READ_CONTEXT.board.b2 = maptonumber(value, 0))]
        }
        break
      case 'b3':
        if (ispresent(READ_CONTEXT.board)) {
          return [true, (READ_CONTEXT.board.b3 = maptonumber(value, 0))]
        }
        break
      case 'b4':
        if (ispresent(READ_CONTEXT.board)) {
          return [true, (READ_CONTEXT.board.b4 = maptonumber(value, 0))]
        }
        break
      case 'b5':
        if (ispresent(READ_CONTEXT.board)) {
          return [true, (READ_CONTEXT.board.b5 = maptonumber(value, 0))]
        }
        break
      case 'b6':
        if (ispresent(READ_CONTEXT.board)) {
          return [true, (READ_CONTEXT.board.b6 = maptonumber(value, 0))]
        }
        break
      case 'b7':
        if (ispresent(READ_CONTEXT.board)) {
          return [true, (READ_CONTEXT.board.b7 = maptonumber(value, 0))]
        }
        break
      case 'b8':
        if (ispresent(READ_CONTEXT.board)) {
          return [true, (READ_CONTEXT.board.b8 = maptonumber(value, 0))]
        }
        break
      case 'b9':
        if (ispresent(READ_CONTEXT.board)) {
          return [true, (READ_CONTEXT.board.b9 = maptonumber(value, 0))]
        }
        break
      case 'b10':
        if (ispresent(READ_CONTEXT.board)) {
          return [true, (READ_CONTEXT.board.b10 = maptonumber(value, 0))]
        }
        break
      // read only
      // env stats
      case 'currenttick':
      case 'boardid':
        return [true, value] // readonly
      case 'playerid':
      case 'playerx':
      case 'playery':
        return [true, value] // readonly
      // object only
      case 'thisid':
      case 'thisx':
      case 'thisy':
        return [true, value] // readonly
      // sender info
      case 'senderid':
      case 'senderx':
      case 'sendery':
        return [true, value] // readonly
      default: {
        // we have to check the object's stats first
        if (STANDARD_STAT_NAMES.has(name)) {
          if (ispresent(READ_CONTEXT.element)) {
            READ_CONTEXT.element[name as keyof BOARD_ELEMENT] = value
          }
          return [true, value]
        }
        break
      }
    }

    // fallback to player flags
    const flags = memoryreadflags(player)
    if (ispresent(flags)) {
      flags[name] = value
      return [true, value]
    }

    // notfound
    return [false, value]
  },
  everytick(chip) {
    // are we player? and is our health number zero or below
    if (READ_CONTEXT.elementisplayer) {
      const health = chip.get('health')
      if (isnumber(health) && health <= 0) {
        // halt program
        chip.endofprogram()
        // time to re-log
        vm_logout(SOFTWARE, READ_CONTEXT.elementid)
      }
    }
    // handle walk movement
    if (
      !READ_CONTEXT.element?.removed &&
      ispresent(READ_CONTEXT.element?.x) &&
      ispresent(READ_CONTEXT.element.y) &&
      ispresent(READ_CONTEXT.element.stepx) &&
      ispresent(READ_CONTEXT.element.stepy) &&
      (READ_CONTEXT.element.stepx || READ_CONTEXT.element.stepy)
    ) {
      memorymoveobject(
        READ_CONTEXT.book,
        READ_CONTEXT.board,
        READ_CONTEXT.element,
        {
          x: READ_CONTEXT.element.x + READ_CONTEXT.element.stepx,
          y: READ_CONTEXT.element.y + READ_CONTEXT.element.stepy,
        },
      )
    }
  },
})
  .command('clear', (chip, words) => {
    for (let i = 0; i < words.length; ++i) {
      chip.set(maptostring(words[i]), 0)
    }
    return 0
  })
  .command('set', (chip, words) => {
    const [name, value] = readargs(words, 0, [ARG_TYPE.NAME, ARG_TYPE.ANY])
    chip.set(name, value ?? 1)
    return 0
  })
  .command('become', (chip, words) => {
    // read
    const [kind] = readargs(words, 0, [ARG_TYPE.KIND])
    // make sure lookup is created
    boardsetlookup(READ_CONTEXT.board)

    // read current display
    const display = bookelementdisplayread(READ_CONTEXT.element)
    const [kindname, maybecolor] = kind

    const mergedstrcolor = [
      ...mapcolortostrcolor(display.color, display.bg),
      ...(maybecolor ?? []),
    ]
    const kindcolorcopy: STR_KIND = [kindname, mergedstrcolor]

    // make invisible
    boardobjectnamedlookupdelete(READ_CONTEXT.board, READ_CONTEXT.element)
    // nuke self
    if (
      boardsafedelete(
        READ_CONTEXT.board,
        READ_CONTEXT.element,
        READ_CONTEXT.timestamp,
      )
    ) {
      const pt: PT = {
        x: READ_CONTEXT.element?.x ?? 0,
        y: READ_CONTEXT.element?.y ?? 0,
      }
      // write new element
      memorywritefromkind(READ_CONTEXT.board, kindcolorcopy, pt)
    }
    // halt execution
    chip.endofprogram()
    return 0
  })
  .command('bind', (_, words) => {
    // zed cafe simply copies the code from the given named element
    const [name] = readargs(words, 0, [ARG_TYPE.NAME])
    const elements = listnamedelements(READ_CONTEXT.board, name)
    if (ispresent(READ_CONTEXT.element) && elements.length > 0) {
      READ_CONTEXT.element.code = pick(...elements).code ?? ''
      memoryresetchipafteredit(READ_CONTEXT.elementid)
    }
    return 0
  })
  .command('char', (_, words) => {
    const [value] = readargs(words, 0, [ARG_TYPE.ANY])
    if (isstrdir(value)) {
      const [dest, charvalue] = readargs(words, 0, [
        ARG_TYPE.DIR,
        ARG_TYPE.NUMBER,
      ])
      const element = boardelementread(READ_CONTEXT.board, dest.destpt)
      if (ispresent(element)) {
        element.char = charvalue
      }
    } else if (ispresent(READ_CONTEXT.element) && isnumber(value)) {
      READ_CONTEXT.element.char = value
    }
    return 0
  })
  .command('color', (_, words) => {
    const [value] = readargs(words, 0, [ARG_TYPE.ANY])
    if (isstrdir(value)) {
      const [dest, colorvalue] = readargs(words, 0, [
        ARG_TYPE.DIR,
        ARG_TYPE.COLOR,
      ])
      const element = boardelementread(READ_CONTEXT.board, dest.destpt)
      if (ispresent(element)) {
        boardelementapplycolor(READ_CONTEXT.element, colorvalue)
      }
    } else {
      const [value] = readargs(words, 0, [ARG_TYPE.COLOR])
      if (ispresent(READ_CONTEXT.element) && ispresent(value)) {
        boardelementapplycolor(READ_CONTEXT.element, value)
      }
    }

    return 0
  })
  .command('go', (chip, words) => {
    if (ispresent(READ_CONTEXT.element)) {
      // attempt to move
      const [dest] = readargs(words, 0, [ARG_TYPE.DIR])
      memorymoveobject(
        READ_CONTEXT.book,
        READ_CONTEXT.board,
        READ_CONTEXT.element,
        dest.destpt,
      )

      // always yield
      chip.yield()

      // if we moved return 0
      if (
        READ_CONTEXT.element.x === dest.destpt.x &&
        READ_CONTEXT.element.y === dest.destpt.y
      ) {
        return 0
      }
    }

    // if blocked, return 1
    return 1
  })
  .command('walk', (_, words) => {
    if (!ispresent(READ_CONTEXT.element)) {
      return 0
    }

    // read walk direction
    const [dest] = readargs(words, 0, [ARG_TYPE.DIR])
    const x = READ_CONTEXT.element.x ?? 0
    const y = READ_CONTEXT.element.y ?? 0

    // create delta from dir
    READ_CONTEXT.element.stepx = dest.destpt.x - x
    READ_CONTEXT.element.stepy = dest.destpt.y - y
    return 0
  })
  .command('idle', (chip) => {
    chip.yield()
    return 0
  })
  .command('end', (chip) => {
    chip.endofprogram()
    return 0
  })
  .command('endwith', (chip, words) => {
    const [maybearg] = readargs(words, 0, [ARG_TYPE.ANY])
    chip.set('arg', maybearg)
    return chip.command('end')
  })
  .command('lock', (chip) => {
    chip.lock(chip.id())
    return 0
  })
  .command('restore', (chip, words) => {
    chip.restore(maptostring(words[0]))
    return 0
  })
  .command('unlock', (chip) => {
    chip.unlock()
    return 0
  })
  .command('zap', (chip, words) => {
    chip.zap(maptostring(words[0]))
    return 0
  })
  .command('cycle', (_, words) => {
    if (ispresent(READ_CONTEXT.element)) {
      // read cycle
      const [cyclevalue] = readargs(words, 0, [ARG_TYPE.NUMBER])
      // write cycle
      READ_CONTEXT.element.cycle = clamp(Math.round(cyclevalue), 1, 255)
    }
    return 0
  })
  .command('die', (chip) => {
    handledie()
    // halt execution
    chip.endofprogram()
    return 0
  })
  .command('dieonend', () => {
    handledie()
    // skip halt execution
    return 0
  })
  .command('run', (_, words) => {
    const [func] = readargs(words, 0, [ARG_TYPE.NAME])
    memoryrun(func)
    return 0
  })
  .command('runwith', (chip, words) => {
    const [arg, func] = readargs(words, 0, [ARG_TYPE.ANY, ARG_TYPE.NAME])
    chip.set('arg', arg)
    memoryrun(func)
    return 0
  })
