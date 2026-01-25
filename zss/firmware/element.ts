import { MathUtils } from 'three'
import { apitoast, registerstore, vmlogout } from 'zss/device/api'
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
  memorypickcodepagewithtype,
  memoryreadelementstat,
  memoryreadflags,
  memoryreadoperator,
  memorywriteelementfromkind,
} from 'zss/memory'
import {
  memoryapplyboardelementcolor,
  memoryboardelementisobject,
} from 'zss/memory/boardelement'
import { memorydeleteboardobjectnamedlookup } from 'zss/memory/boardlookup'
import { memorymoveobject } from 'zss/memory/boardmovement'
import {
  memoryreadelement,
  memoryreadelementbyidorindex,
  memorysafedeleteelement,
} from 'zss/memory/boardoperations'
import { memoryreadelementdisplay } from 'zss/memory/bookoperations'
import { memorysendtolog } from 'zss/memory/gamesend'
import { memoryhaltchip, memoryruncodepage } from 'zss/memory/runtime'
import {
  memoryfindplayerforelement,
  memorylistboardnamedelements,
} from 'zss/memory/spatialqueries'
import { BOARD_ELEMENT, CODE_PAGE_TYPE } from 'zss/memory/types'
import { categoryconsts } from 'zss/words/category'
import { collisionconsts } from 'zss/words/collision'
import {
  colorconsts,
  isstrcolor,
  mapcolortostrcolor,
  mapstrcolortoattributes,
} from 'zss/words/color'
import { dirconsts, isstrdir } from 'zss/words/dir'
import { STR_KIND } from 'zss/words/kind'
import { ARG_TYPE, READ_CONTEXT, readargs } from 'zss/words/reader'
import { COLOR, NAME, PT } from 'zss/words/types'

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
    const focus = memoryfindplayerforelement(
      READ_CONTEXT.board,
      { x: READ_CONTEXT.element?.x ?? -1, y: READ_CONTEXT.element?.y ?? -1 },
      READ_CONTEXT.elementfocus,
    )

    // player id
    const playerid =
      focus?.id ?? READ_CONTEXT.elementfocus ?? memoryreadoperator()

    // sender info
    const maybesender = READ_CONTEXT.element?.sender
    const sender = memoryreadelementbyidorindex(
      READ_CONTEXT.board,
      isstring(maybesender) ? maybesender : '',
    )

    // read stat
    switch (name) {
      // board stats
      case 'camera':
      case 'graphics':
      case 'facing': {
        // read player flag
        const value = memoryreadflags(playerid)[name]
        return [
          true,
          ispresent(value)
            ? // player flags checked first
              value
            : // fallback to board
              (READ_CONTEXT.board?.[name] ?? 0),
        ]
      }
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
      case 'palette':
        return [true, READ_CONTEXT.board?.palette ?? '']
      case 'charset':
        return [true, READ_CONTEXT.board?.charset ?? '']
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
        return [true, READ_CONTEXT.board?.b2 ?? 0]
      case 'b3':
        return [true, READ_CONTEXT.board?.b3 ?? 0]
      case 'b4':
        return [true, READ_CONTEXT.board?.b4 ?? 0]
      case 'b5':
        return [true, READ_CONTEXT.board?.b5 ?? 0]
      case 'b6':
        return [true, READ_CONTEXT.board?.b6 ?? 0]
      case 'b7':
        return [true, READ_CONTEXT.board?.b7 ?? 0]
      case 'b8':
        return [true, READ_CONTEXT.board?.b8 ?? 0]
      case 'b9':
        return [true, READ_CONTEXT.board?.b9 ?? 0]
      case 'b10':
        return [true, READ_CONTEXT.board?.b10 ?? 0]
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
      case 'senderid':
        return [true, sender?.id ?? '']
      case 'senderx':
        return [true, sender?.x ?? -1]
      case 'sendery':
        return [true, sender?.y ?? -1]
      default: {
        // return result
        if (STANDARD_STAT_NAMES.has(name)) {
          // check standard stat names
          const maybevalue = memoryreadelementstat(
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
    const focuspt = {
      x: READ_CONTEXT.element?.x ?? -1,
      y: READ_CONTEXT.element?.y ?? -1,
    }
    // >>> this <<< uses focus
    const focus = memoryfindplayerforelement(
      READ_CONTEXT.board,
      focuspt,
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
      case 'facing':
        // constrain facing to 360 degrees
        value = MathUtils.euclideanModulo(value, 360)
        break
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
          const valuestr = maptostring(value)
          // reset lookup
          if (READ_CONTEXT.board.over !== valuestr) {
            READ_CONTEXT.board.overboard = undefined
          }
          READ_CONTEXT.board.over = valuestr
          return [true, valuestr]
        }
        break
      case 'under':
        if (ispresent(READ_CONTEXT.board)) {
          const valuestr = maptostring(value)
          // reset lookup
          if (READ_CONTEXT.board.under !== valuestr) {
            READ_CONTEXT.board.underboard = undefined
          }
          READ_CONTEXT.board.under = valuestr
          return [true, valuestr]
        }
        break
      case 'palette':
        if (ispresent(READ_CONTEXT.board)) {
          const valuestr = maptostring(value)
          // reset lookup
          if (READ_CONTEXT.board.palette !== valuestr) {
            READ_CONTEXT.board.palettepage = undefined
          }
          READ_CONTEXT.board.palette = valuestr
          return [true, valuestr]
        }
        break
      case 'charset':
        if (ispresent(READ_CONTEXT.board)) {
          const valuestr = maptostring(value)
          // reset lookup
          if (READ_CONTEXT.board.charset !== valuestr) {
            READ_CONTEXT.board.charsetpage = undefined
          }
          READ_CONTEXT.board.charset = valuestr
          return [true, valuestr]
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
          return [true, (READ_CONTEXT.board.b1 = value)]
        }
        break
      case 'b2':
        if (ispresent(READ_CONTEXT.board)) {
          return [true, (READ_CONTEXT.board.b2 = value)]
        }
        break
      case 'b3':
        if (ispresent(READ_CONTEXT.board)) {
          return [true, (READ_CONTEXT.board.b3 = value)]
        }
        break
      case 'b4':
        if (ispresent(READ_CONTEXT.board)) {
          return [true, (READ_CONTEXT.board.b4 = value)]
        }
        break
      case 'b5':
        if (ispresent(READ_CONTEXT.board)) {
          return [true, (READ_CONTEXT.board.b5 = value)]
        }
        break
      case 'b6':
        if (ispresent(READ_CONTEXT.board)) {
          return [true, (READ_CONTEXT.board.b6 = value)]
        }
        break
      case 'b7':
        if (ispresent(READ_CONTEXT.board)) {
          return [true, (READ_CONTEXT.board.b7 = value)]
        }
        break
      case 'b8':
        if (ispresent(READ_CONTEXT.board)) {
          return [true, (READ_CONTEXT.board.b8 = value)]
        }
        break
      case 'b9':
        if (ispresent(READ_CONTEXT.board)) {
          return [true, (READ_CONTEXT.board.b9 = value)]
        }
        break
      case 'b10':
        if (ispresent(READ_CONTEXT.board)) {
          return [true, (READ_CONTEXT.board.b10 = value)]
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
        if (ispresent(READ_CONTEXT.element)) {
          // yes this means you can write #set senderid <something>
          READ_CONTEXT.element.sender = value
        }
        return [true, value]
      case 'senderx':
      case 'sendery':
        return [true, value] // readonly
      default: {
        // we have to check the object's stats first
        if (STANDARD_STAT_NAMES.has(name)) {
          if (ispresent(READ_CONTEXT.element)) {
            switch (name) {
              case 'color':
                if (isstrcolor(value)) {
                  const { color, bg } = mapstrcolortoattributes(value)
                  if (ispresent(color)) {
                    READ_CONTEXT.element.color = color
                  }
                  if (ispresent(bg)) {
                    READ_CONTEXT.element.bg = bg
                  }
                } else if (isnumber(value)) {
                  READ_CONTEXT.element.color = value
                } else {
                  // error ?
                }
                break
              case 'bg':
                if (isstrcolor(value)) {
                  const { color, bg } = mapstrcolortoattributes(value)
                  READ_CONTEXT.element.bg = color ?? bg ?? COLOR.PURPLE
                } else if (isnumber(value)) {
                  READ_CONTEXT.element.bg = value
                } else {
                  // error ?
                }
                break
              case 'displaycolor':
                if (isstrcolor(value)) {
                  const { color, bg } = mapstrcolortoattributes(value)
                  if (ispresent(color)) {
                    READ_CONTEXT.element.displaycolor = color
                  }
                  if (ispresent(bg)) {
                    READ_CONTEXT.element.displaybg = bg
                  }
                } else if (isnumber(value)) {
                  READ_CONTEXT.element.displaycolor = value
                } else {
                  // error ?
                }
                break
              case 'displaybg': {
                if (isstrcolor(value)) {
                  const { color, bg } = mapstrcolortoattributes(value)
                  READ_CONTEXT.element.displaybg = color ?? bg ?? COLOR.PURPLE
                } else if (isnumber(value)) {
                  READ_CONTEXT.element.displaybg = value
                } else {
                  // error ?
                }
                break
              }
              default:
                READ_CONTEXT.element[name as keyof BOARD_ELEMENT] = value
                break
            }
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
      // sticky flags
      switch (name) {
        case 'user':
          registerstore(SOFTWARE, player, name, value)
          break
      }
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
        // signal outcome
        vmlogout(SOFTWARE, READ_CONTEXT.elementid, true)
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

    // read current display
    const display = memoryreadelementdisplay(READ_CONTEXT.element)
    const [kindname, maybecolor] = kind

    const mergedstrcolor = [
      ...mapcolortostrcolor(display.color, display.bg),
      ...(maybecolor ?? []),
    ]
    const kindcolorcopy: STR_KIND = [kindname, mergedstrcolor]

    // make invisible
    memorydeleteboardobjectnamedlookup(READ_CONTEXT.board, READ_CONTEXT.element)
    // nuke self
    if (
      memorysafedeleteelement(
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
      memorywriteelementfromkind(READ_CONTEXT.board, kindcolorcopy, pt)
    }
    // halt execution
    chip.endofprogram()
    return 0
  })
  .command('bind', (_, words) => {
    // zed cafe simply copies the code from the given named element
    const [name] = readargs(words, 0, [ARG_TYPE.NAME])
    const elements = memorylistboardnamedelements(READ_CONTEXT.board, name)
    if (ispresent(READ_CONTEXT.element) && elements.length > 0) {
      READ_CONTEXT.element.code = pick(...elements).code ?? ''
      memoryhaltchip(READ_CONTEXT.elementid)
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
      // handle multi-target dirs
      if (dest.targets.length) {
        for (let i = 0; i < dest.targets.length; ++i) {
          const target = dest.targets[i]
          const element = memoryreadelement(READ_CONTEXT.board, target)
          if (ispresent(element)) {
            element.char = charvalue
          }
        }
        return 0
      }
      // handle single-target dirs
      const element = memoryreadelement(READ_CONTEXT.board, dest.destpt)
      if (ispresent(element)) {
        element.char = charvalue
      }
    } else if (ispresent(READ_CONTEXT.element) && isnumber(value)) {
      // self char update
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
      // handle multi-target dirs
      if (dest.targets.length) {
        for (let i = 0; i < dest.targets.length; ++i) {
          const target = dest.targets[i]
          const element = memoryreadelement(READ_CONTEXT.board, target)
          if (ispresent(element)) {
            memoryapplyboardelementcolor(element, colorvalue ?? COLOR.PURPLE)
          }
        }
        return 0
      }
      // handle single-target dirs
      const element = memoryreadelement(READ_CONTEXT.board, dest.destpt)
      if (ispresent(element)) {
        memoryapplyboardelementcolor(element, colorvalue ?? COLOR.PURPLE)
      }
    } else {
      // self color update
      const [colorvalue] = readargs(words, 0, [ARG_TYPE.COLOR])
      if (ispresent(READ_CONTEXT.element) && ispresent(colorvalue)) {
        memoryapplyboardelementcolor(READ_CONTEXT.element, colorvalue)
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
  .command('end', (chip, words) => {
    const [result] = readargs(words, 0, [ARG_TYPE.ANY])
    if (ispresent(result)) {
      chip.set('arg', result)
    }
    chip.endofprogram()
    return 0
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
    memorysafedeleteelement(
      READ_CONTEXT.board,
      READ_CONTEXT.element,
      READ_CONTEXT.timestamp,
    )

    // special case for items
    if (memoryreadelementstat(READ_CONTEXT.element, 'item')) {
      // yoink player if item
      // find focused on player
      const from: PT = {
        x: READ_CONTEXT.element?.x ?? -1,
        y: READ_CONTEXT.element?.y ?? -1,
      }
      const focus = memoryfindplayerforelement(
        READ_CONTEXT.board,
        from,
        READ_CONTEXT.elementfocus,
      )
      if (
        ispresent(focus?.x) &&
        ispresent(focus.y) &&
        // need to be in contact to yoink
        Math.abs(focus.x - from.x) + Math.abs(focus.y - from.y) < 2
      ) {
        focus.x = from.x
        focus.y = from.y
      }
    } else {
      // for all non items halt execution
      chip.endofprogram()
    }
    return 0
  })
  .command('run', (_, words) => {
    const [func] = readargs(words, 0, [ARG_TYPE.NAME])
    memoryruncodepage(func)
    return 0
  })
  .command('runwith', (chip, words) => {
    const [arg, func] = readargs(words, 0, [ARG_TYPE.ANY, ARG_TYPE.NAME])
    chip.set('arg', arg)
    memoryruncodepage(func)
    return 0
  })
  .command('array', (chip, words) => {
    const values: any[] = []
    const [name, ii] = readargs(words, 0, [ARG_TYPE.NAME])
    for (let i = ii; i < words.length; ) {
      const [val, iii] = readargs(words, i, [ARG_TYPE.ANY])
      values.push(val)
      i = iii
    }
    chip.set(name, values)
    return 0
  })
  .command('read', (chip, words) => {
    const [from, prop, name] = readargs(words, 0, [
      ARG_TYPE.ANY,
      ARG_TYPE.NUMBER_OR_STRING,
      ARG_TYPE.NAME,
    ])
    if (ispresent(from)) {
      const value = from[prop]
      chip.set(name, value)
    }
    return 0
  })
  .command('load', (_, words) => {
    const [dir, maybeaction, ii] = readargs(words, 0, [
      ARG_TYPE.DIR,
      ARG_TYPE.NAME,
    ])

    const maybeobject = memoryreadelement(READ_CONTEXT.board, dir.destpt)
    if (ispresent(maybeobject) && memoryboardelementisobject(maybeobject)) {
      // update .code of object to the codepage content of kindname
      switch (NAME(maybeaction)) {
        case 'append': {
          const [kindname] = readargs(words, ii, [ARG_TYPE.NAME])
          const codepage = memorypickcodepagewithtype(
            CODE_PAGE_TYPE.OBJECT,
            kindname,
          )
          if (ispresent(codepage)) {
            maybeobject.code += codepage.code
            memoryhaltchip(maybeobject.id ?? '')
          }
          break
        }
        default: {
          const codepage = memorypickcodepagewithtype(
            CODE_PAGE_TYPE.OBJECT,
            maybeaction,
          )
          if (ispresent(codepage)) {
            maybeobject.code = codepage.code
            memoryhaltchip(maybeobject.id ?? '')
          }
          break
        }
      }
    }

    return 0
  })
  .command('toast', (_, words) => {
    const text = words.map(maptostring).join('')
    apitoast(SOFTWARE, READ_CONTEXT.elementfocus, text)
    return 0
  })
  .command('ticker', (_, words) => {
    const text = words.map(maptostring).join('')
    if (ispresent(READ_CONTEXT.element)) {
      READ_CONTEXT.element.tickertext = text
      READ_CONTEXT.element.tickertime = READ_CONTEXT.timestamp
      // log text
      memorysendtolog(READ_CONTEXT.board?.id, READ_CONTEXT.element, text)
    }
    return 0
  })
