import { Color } from 'three'
import { objectKeys } from 'ts-extras'
import {
  loadcharsetfrombytes,
  loadpalettefrombytes,
  writecharfrombytes,
} from 'zss/feature/bytes'
import { CHARSET } from 'zss/feature/charset'
import {
  FORMAT_OBJECT,
  FORMAT_SKIP,
  formatobject,
  unformatobject,
} from 'zss/feature/format'
import { PALETTE } from 'zss/feature/palette'
import { BITMAP } from 'zss/gadget/data/bitmap'
import { FILE_BYTES_PER_COLOR } from 'zss/gadget/data/types'
import { stat, tokenize } from 'zss/lang/lexer'
import { createsid } from 'zss/mapping/guid'
import { clamp } from 'zss/mapping/number'
import {
  MAYBE,
  isarray,
  isnumber,
  ispresent,
  isstring,
} from 'zss/mapping/types'
import { maptostring } from 'zss/mapping/value'
import { mapstrcolor } from 'zss/words/color'
import { statformat, stattypestring } from 'zss/words/stats'
import {
  CATEGORY,
  COLLISION,
  COLOR,
  DIR,
  NAME,
  STAT_TYPE,
} from 'zss/words/types'

import {
  memoryexportboardelement,
  memoryboardelementimport,
  memorycreateboardelement,
} from './boardelement'
import {
  memoryboardexport,
  memoryboardimport,
  memorycreateboard,
} from './boardoperations'
import {
  BOARD_ELEMENT,
  CODE_PAGE,
  CODE_PAGE_STATS,
  CODE_PAGE_TYPE,
  CODE_PAGE_TYPE_MAP,
} from './types'

enum BITMAP_KEYS {
  width,
  height,
  bits,
}

export function memorybitmapexport(
  bitmap: MAYBE<BITMAP>,
): MAYBE<FORMAT_OBJECT> {
  return formatobject(bitmap, BITMAP_KEYS, {
    bits: (bits: Uint8Array) => Array.from(bits),
  })
}

export function memorybitmapimport(
  bitmapentry: MAYBE<FORMAT_OBJECT>,
): MAYBE<BITMAP> {
  return unformatobject(bitmapentry, BITMAP_KEYS, {
    bits: (bits: number[]) => new Uint8Array(bits),
  })
}

export function memorycodepageapplyelementstats(
  stats: CODE_PAGE_STATS,
  element: BOARD_ELEMENT,
) {
  const keys = Object.keys(stats)
  for (let i = 0; i < keys.length; ++i) {
    const key = keys[i]
    const value = stats[key]
    if (isarray(value)) {
      // only set when element stat is undefined
      const [input, ...args] = value
      switch (input) {
        case 'text':
          if (!ispresent(element[key as keyof BOARD_ELEMENT])) {
            element[key as keyof BOARD_ELEMENT] = ''
          }
          break
        case 'range':
          if (!ispresent(element[key as keyof BOARD_ELEMENT])) {
            element[key as keyof BOARD_ELEMENT] = 4
          }
          break
        case 'number':
          if (!ispresent(element[key as keyof BOARD_ELEMENT])) {
            element[key as keyof BOARD_ELEMENT] = 0
          }
          break
        case 'select':
          if (!ispresent(element[key as keyof BOARD_ELEMENT])) {
            const [, firstvalue] = args
            element[key as keyof BOARD_ELEMENT] = firstvalue
          }
          break
      }
      // non-const stats here don't make sense
      continue
    }
    switch (key) {
      case 'name':
      case 'char':
      case 'light':
      case 'group':
      case 'p1':
      case 'p2':
      case 'p3':
      case 'p4':
      case 'p5':
      case 'p6':
      case 'p7':
      case 'p8':
      case 'p9':
      case 'p10':
      case 'cycle':
      case 'stepx':
      case 'stepy':
      case 'shootx':
      case 'shooty':
      case 'displaychar':
        element[key as keyof BOARD_ELEMENT] = value
        break
      case 'color':
      case 'bg':
      case 'lightdir':
      case 'displaycolor':
      case 'displaybg':
        // @ts-expect-error - we are doing this on purpose
        element[key] = mapstrtoconsts(value) ?? value
        break
      case 'isitem':
        element.item = 1
        break
      case 'notitem':
        element.item = 0
        break
      case 'ispushable':
        // @ts-expect-error - we are doing this on purpose
        element.pushable = value === '' ? 1 : value
        break
      case 'notpushable':
        element.pushable = 0
        break
      case 'iswalk':
      case 'iswalking':
      case 'iswalkable':
        element.collision = COLLISION.ISWALK
        break
      case 'isswim':
      case 'isswimming':
      case 'isswimable':
        element.collision = COLLISION.ISSWIM
        break
      case 'issolid':
        element.collision = COLLISION.ISSOLID
        break
      case 'isbullet':
        element.collision = COLLISION.ISBULLET
        break
      case 'isghost':
        element.collision = COLLISION.ISGHOST
        break
      case 'isbreakable':
        element.breakable = 1
        break
      case 'notbreakable':
        element.breakable = 0
        break
      default:
        break
    }
  }
}

export function memorycodepageexport(
  codepage: MAYBE<CODE_PAGE>,
): MAYBE<FORMAT_OBJECT> {
  return formatobject(codepage, CODE_PAGE_KEYS, {
    board: memoryboardexport,
    object: memoryexportboardelement,
    terrain: memoryexportboardelement,
    charset: memorybitmapexport,
    palette: memorybitmapexport,
    stats: FORMAT_SKIP,
  })
}

// safe to serialize copy of codepage

export function memorycodepagehasmatch(
  codepage: MAYBE<CODE_PAGE>,
  type: CODE_PAGE_TYPE,
  ids: string[],
): boolean {
  if (!ispresent(codepage) || memorycodepagereadtype(codepage) !== type) {
    return false
  }
  if (ids.some((id) => id === codepage.id)) {
    return true
  }
  return false
}

export function memorycodepageimport(
  codepageentry: MAYBE<FORMAT_OBJECT>,
): MAYBE<CODE_PAGE> {
  return unformatobject<CODE_PAGE>(codepageentry, CODE_PAGE_KEYS, {
    board: memoryboardimport,
    object: memoryboardelementimport,
    terrain: memoryboardelementimport,
    charset: memorybitmapimport,
    palette: memorybitmapimport,
  })
}

export function memorycodepagereaddata<T extends CODE_PAGE_TYPE>(
  codepage: MAYBE<CODE_PAGE>,
): MAYBE<CODE_PAGE_TYPE_MAP[T]> {
  if (!ispresent(codepage)) {
    return
  }
  switch (memorycodepagereadtype(codepage)) {
    default: {
      // empty / invalid
      return undefined
    }
    case CODE_PAGE_TYPE.ERROR: {
      return (codepage.code ?? '') as MAYBE<CODE_PAGE_TYPE_MAP[T]>
    }
    case CODE_PAGE_TYPE.LOADER: {
      return (codepage.code ?? '') as MAYBE<CODE_PAGE_TYPE_MAP[T]>
    }
    case CODE_PAGE_TYPE.BOARD: {
      // validate and shape board into usable state
      if (!ispresent(codepage.board)) {
        codepage.board = memorycreateboard()
      }

      codepage.board.id = codepage.id
      codepage.board.name = memorycodepagereadname(codepage)
      // unpack stats into board data
      const stats = memorycodepagereadstatdefaults(codepage)
      const keys = Object.keys(stats)
      for (let i = 0; i < keys.length; ++i) {
        const key = keys[i]
        const value = stats[key]
        switch (key) {
          case 'isdark':
            codepage.board.isdark = 1
            break
          case 'notdark':
            codepage.board.isdark = 0
            break
          case 'restartonzap':
            codepage.board.restartonzap = 1
            break
          case 'norestartonzap':
            codepage.board.restartonzap = 0
            break
          case 'startx':
          case 'starty':
          case 'facing':
          case 'timelimit':
          case 'maxplayershots':
            if (isnumber(value)) {
              codepage.board[key] = value
            }
            break
          case 'over':
          case 'under':
          case 'camera':
          case 'graphics':
          case 'charset':
          case 'palette':
          case 'exitnorth':
          case 'exitsouth':
          case 'exitwest':
          case 'exiteast':
            if (isstring(value)) {
              if (NAME(value) === 'empty') {
                codepage.board[key] = undefined
              } else {
                codepage.board[key] = value
              }
            }
            break
          case 'b1':
          case 'b2':
          case 'b3':
          case 'b4':
          case 'b5':
          case 'b6':
          case 'b7':
          case 'b8':
          case 'b9':
          case 'b10':
            if (ispresent(value)) {
              // @ts-expect-error yes
              codepage.board[key] = mapstrtoconsts(value) ?? value
            }
            break
        }
      }
      return codepage.board as MAYBE<CODE_PAGE_TYPE_MAP[T]>
    }
    case CODE_PAGE_TYPE.OBJECT: {
      // validate and shape object into usable state
      if (!ispresent(codepage.object)) {
        codepage.object = memorycreateboardelement()
      }
      codepage.object.id = codepage.id
      codepage.object.code = codepage.code
      codepage.object.name = memorycodepagereadname(codepage)
      codepage.object.category = CATEGORY.ISOBJECT
      memorycodepageapplyelementstats(
        memorycodepagereadstatdefaults(codepage),
        codepage.object,
      )
      return codepage.object as MAYBE<CODE_PAGE_TYPE_MAP[T]>
    }
    case CODE_PAGE_TYPE.TERRAIN: {
      // validate and shape terrain into usable state
      if (!ispresent(codepage.terrain)) {
        codepage.terrain = memorycreateboardelement()
      }
      codepage.terrain.id = codepage.id
      codepage.terrain.name = memorycodepagereadname(codepage)
      codepage.terrain.category = CATEGORY.ISTERRAIN
      memorycodepageapplyelementstats(
        memorycodepagereadstatdefaults(codepage),
        codepage.terrain,
      )
      return codepage.terrain as MAYBE<CODE_PAGE_TYPE_MAP[T]>
    }
    case CODE_PAGE_TYPE.PALETTE: {
      // validate and shape palette into usable state
      if (!ispresent(codepage.palette)) {
        // clone default
        codepage.palette = loadpalettefrombytes(PALETTE)
      }
      if (ispresent(codepage.palette?.bits)) {
        const stats = memorycodepagereadstatdefaults(codepage)
        const statnames = objectKeys(stats)
        for (let i = 0; i < statnames.length; ++i) {
          const statname = statnames[i].toLowerCase()
          const statvalue = stats[statname]
          if (statname.startsWith('color') && isstring(statvalue)) {
            const idx = parseFloat(statname.replace('color', ''))
            if (idx >= 0 && idx <= 15) {
              colorparse.set(statvalue)
              const row = idx * FILE_BYTES_PER_COLOR
              const cpr = colorparse.r * 63
              const cpg = colorparse.g * 63
              const cpb = colorparse.b * 63
              codepage.palette.bits[row + 0] = clamp(cpr, 0, 63)
              codepage.palette.bits[row + 1] = clamp(cpg, 0, 63)
              codepage.palette.bits[row + 2] = clamp(cpb, 0, 63)
            }
          }
        }
      }
      return codepage.palette as MAYBE<CODE_PAGE_TYPE_MAP[T]>
    }
    case CODE_PAGE_TYPE.CHARSET: {
      // validate and shape charset into usable state
      if (!ispresent(codepage.charset)) {
        // clone default
        codepage.charset = loadcharsetfrombytes(CHARSET)
      }
      if (ispresent(codepage.charset?.bits)) {
        const stats = memorycodepagereadstatdefaults(codepage)
        const statnames = objectKeys(stats)
        for (let i = 0; i < statnames.length; ++i) {
          const statname = statnames[i].toLowerCase()
          const statvalue = stats[statname]
          if (statname.startsWith('char') && isstring(statvalue)) {
            const idx = parseFloat(statname.replace('char', ''))
            if (idx >= 0 && idx <= 255) {
              const SIZE = 8 * 14
              const pixels: number[] = []
              for (let i = 0; i < SIZE; ++i) {
                const pixel = statvalue[i]
                switch (pixel) {
                  case '-':
                  case undefined:
                    pixels.push(0)
                    break
                  default:
                    pixels.push(128)
                    break
                }
              }
              writecharfrombytes(Uint8Array.from(pixels), codepage.charset, idx)
            }
          }
        }
      }
      return codepage.charset as MAYBE<CODE_PAGE_TYPE_MAP[T]>
    }
  }
}

export function memorycodepagereadname(codepage: MAYBE<CODE_PAGE>) {
  const stats = memorycodepagereadstats(codepage)
  return stats.name ?? ''
}

export function memorycodepagereadstat(
  codepage: MAYBE<CODE_PAGE>,
  stat: string,
) {
  const stats = memorycodepagereadstats(codepage)
  return stats[stat]
}

const colorparse = new Color()

function mapstrtoconsts(value: any): MAYBE<COLOR | DIR> {
  if (!isstring(value)) {
    return undefined
  }
  const maybestrcolor = mapstrcolor(value)
  if (ispresent(maybestrcolor) && ispresent(COLOR[maybestrcolor])) {
    return COLOR[maybestrcolor]
  }
  const strdir = NAME(value)
  // @ts-expect-error yes
  const maybedir = DIR[strdir]
  if (ispresent(maybedir)) {
    return maybedir
  }
  return undefined
}

export function memorycodepagereadstatdefaults(
  codepage: MAYBE<CODE_PAGE>,
): CODE_PAGE_STATS {
  const stats = { ...memorycodepagereadstats(codepage) }

  // extract defaults
  Object.keys(stats).forEach((key) => {
    switch (key) {
      case 'type':
      case 'name':
        // trim
        delete stats[key]
        break
    }
  })

  // send it
  return stats
}

export function memorycodepagereadstats(
  codepage: MAYBE<CODE_PAGE>,
): CODE_PAGE_STATS {
  if (!ispresent(codepage)) {
    return {}
  }

  // cached results !
  if (ispresent(codepage.stats?.type)) {
    return codepage.stats
  }

  codepage.stats = memorycodepagereadstatsfromtext(codepage.code)

  // default to object type
  if (!ispresent(codepage.stats.type)) {
    codepage.stats.type = CODE_PAGE_TYPE.OBJECT
  }

  // results !
  return codepage.stats
}

export function memorycodepagereadstatsfromtext(
  content: string,
): CODE_PAGE_STATS {
  const parse = tokenize(content)
  const stats: CODE_PAGE_STATS = {}

  // extract @stat lines
  let isfirst = true
  for (let i = 0; i < parse.tokens.length; ++i) {
    const token = parse.tokens[i]
    if (token.tokenType === stat) {
      const source = token.image.slice(1)
      const [sourcewords, label] = source.split(';').map((str) => str.trim())
      const words = sourcewords.split(' ')
      const stat = statformat(isstring(label) ? label : '', words, isfirst)
      const maybename = stat.values.join(' ')
      isfirst = false
      switch (stat.type) {
        case STAT_TYPE.LOADER:
          stats.type = CODE_PAGE_TYPE.LOADER
          stats.name = maybename
          break
        case STAT_TYPE.BOARD:
          stats.type = CODE_PAGE_TYPE.BOARD
          stats.name = maybename
          break
        case STAT_TYPE.OBJECT:
          stats.type = CODE_PAGE_TYPE.OBJECT
          stats.name = maybename || 'object'
          break
        case STAT_TYPE.TERRAIN:
          stats.type = CODE_PAGE_TYPE.TERRAIN
          stats.name = maybename
          break
        case STAT_TYPE.CHARSET:
          stats.type = CODE_PAGE_TYPE.CHARSET
          stats.name = maybename
          break
        case STAT_TYPE.PALETTE:
          stats.type = CODE_PAGE_TYPE.PALETTE
          stats.name = maybename
          break
        case STAT_TYPE.CONST: {
          const [maybename, ...maybevalues] = stat.values
          if (isstring(maybename)) {
            const name = NAME(maybename)
            const maybevalue = maybevalues.join(' ')
            if (isstring(maybevalue)) {
              const numbervalue = parseFloat(maybevalue)
              if (isnumber(numbervalue)) {
                stats[name] = numbervalue
              } else {
                stats[name] = `${maptostring(stats[name])}${maybevalue}`
              }
            } else {
              stats[name] = 1
            }
          }
          break
        }
        case STAT_TYPE.RANGE:
        case STAT_TYPE.SELECT:
        case STAT_TYPE.NUMBER:
        case STAT_TYPE.TEXT:
        case STAT_TYPE.HOTKEY:
        case STAT_TYPE.ZSSEDIT:
        case STAT_TYPE.CHAREDIT:
        case STAT_TYPE.COLOREDIT: {
          const [maybename, ...args] = stat.values
          if (isstring(maybename)) {
            const name = NAME(maybename)
            stats[name] = [stattypestring(stat.type), ...args]
          }
          break
        }
      }
    }
  }

  return stats
}

export function memorycodepagereadtype(codepage: MAYBE<CODE_PAGE>) {
  const stats = memorycodepagereadstats(codepage)
  return stats.type ?? CODE_PAGE_TYPE.ERROR
}

export function memorycodepagereadtypetostring(codepage: MAYBE<CODE_PAGE>) {
  return memorycodepagetypetostring(memorycodepagereadtype(codepage))
}

export function memorycodepageresetstats(
  codepage: MAYBE<CODE_PAGE>,
): CODE_PAGE_STATS {
  if (!ispresent(codepage)) {
    return {}
  }
  codepage.stats = undefined
  return memorycodepagereadstats(codepage)
}

export function memorycodepagetypetostring(
  type: MAYBE<CODE_PAGE_TYPE>,
): string {
  switch (type) {
    default:
    case CODE_PAGE_TYPE.ERROR:
      return 'error'
    case CODE_PAGE_TYPE.LOADER:
      return stattypestring(STAT_TYPE.LOADER)
    case CODE_PAGE_TYPE.BOARD:
      return stattypestring(STAT_TYPE.BOARD)
    case CODE_PAGE_TYPE.OBJECT:
      return stattypestring(STAT_TYPE.OBJECT)
    case CODE_PAGE_TYPE.TERRAIN:
      return stattypestring(STAT_TYPE.TERRAIN)
    case CODE_PAGE_TYPE.CHARSET:
      return stattypestring(STAT_TYPE.CHARSET)
    case CODE_PAGE_TYPE.PALETTE:
      return stattypestring(STAT_TYPE.PALETTE)
  }
}

export function memorycreatecodepage(
  code: string,
  content: Partial<Omit<CODE_PAGE, 'id' | 'code'>>,
): CODE_PAGE {
  return {
    id: createsid(),
    code,
    ...content,
  }
}

enum CODE_PAGE_KEYS {
  id,
  code,
  board,
  object,
  terrain,
  charset,
  palette,
  eighttrack,
}

// safe to serialize copy of codepage
