import { Color } from 'three'
import { objectKeys } from 'ts-extras'
import { loadcharsetfrombytes, loadpalettefrombytes } from 'zss/feature/bytes'
import { CHARSET } from 'zss/feature/charset'
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

import { createboard, exportboard, importboard } from './board'
import {
  createboardelement,
  exportboardelement,
  importboardelement,
} from './boardelement'
import {
  FORMAT_OBJECT,
  FORMAT_SKIP,
  formatobject,
  unformatobject,
} from './format'
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

export function exportbitmap(bitmap: MAYBE<BITMAP>): MAYBE<FORMAT_OBJECT> {
  return formatobject(bitmap, BITMAP_KEYS, {
    bits: (bits: Uint8Array) => Array.from(bits),
  })
}

export function importbitmap(bitmapentry: MAYBE<FORMAT_OBJECT>): MAYBE<BITMAP> {
  return unformatobject(bitmapentry, BITMAP_KEYS, {
    bits: (bits: number[]) => new Uint8Array(bits),
  })
}

export function createcodepage(
  code: string,
  content: Partial<Omit<CODE_PAGE, 'id' | 'code'>>,
) {
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
export function exportcodepage(
  codepage: MAYBE<CODE_PAGE>,
): MAYBE<FORMAT_OBJECT> {
  return formatobject(codepage, CODE_PAGE_KEYS, {
    board: exportboard,
    object: exportboardelement,
    terrain: exportboardelement,
    charset: exportbitmap,
    palette: exportbitmap,
    stats: FORMAT_SKIP,
  })
}

// safe to serialize copy of codepage
export function importcodepage(
  codepageentry: MAYBE<FORMAT_OBJECT>,
): MAYBE<CODE_PAGE> {
  return unformatobject<CODE_PAGE>(codepageentry, CODE_PAGE_KEYS, {
    board: importboard,
    object: importboardelement,
    terrain: importboardelement,
    charset: importbitmap,
    palette: importbitmap,
  })
}

export function codepagehasmatch(
  codepage: MAYBE<CODE_PAGE>,
  type: CODE_PAGE_TYPE,
  ids: string[],
): boolean {
  if (!ispresent(codepage) || codepagereadtype(codepage) !== type) {
    return false
  }
  if (ids.some((id) => id === codepage.id)) {
    return true
  }
  return false
}

export function codepagereadstatdefaults(
  codepage: MAYBE<CODE_PAGE>,
): CODE_PAGE_STATS {
  const stats = { ...codepagereadstats(codepage) }

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

export function codepageresetstats(
  codepage: MAYBE<CODE_PAGE>,
): CODE_PAGE_STATS {
  if (!ispresent(codepage)) {
    return {}
  }
  codepage.stats = undefined
  return codepagereadstats(codepage)
}

export function codepagereadstatsfromtext(content: string): CODE_PAGE_STATS {
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
      const maybename = NAME(stat.values.join(' '))
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
          const [maybename, maybevalue] = stat.values
          if (isstring(maybename)) {
            const name = NAME(maybename)
            if (isstring(maybevalue)) {
              // can we parse consts here ???? too ????
              const numbervalue = parseFloat(maybevalue)
              stats[name] = isnumber(numbervalue) ? numbervalue : maybevalue
            } else if (isnumber(maybevalue)) {
              stats[name] = maybevalue
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

export function codepagereadstats(codepage: MAYBE<CODE_PAGE>): CODE_PAGE_STATS {
  if (!ispresent(codepage)) {
    return {}
  }

  // cached results !
  if (ispresent(codepage.stats?.type)) {
    return codepage.stats
  }

  codepage.stats = codepagereadstatsfromtext(codepage.code)

  // default to object type
  if (!ispresent(codepage.stats.type)) {
    codepage.stats.type = CODE_PAGE_TYPE.OBJECT
  }

  // results !
  return codepage.stats
}

export function codepagetypetostring(type: MAYBE<CODE_PAGE_TYPE>): string {
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

export function codepagereadtype(codepage: MAYBE<CODE_PAGE>) {
  const stats = codepagereadstats(codepage)
  return stats.type ?? CODE_PAGE_TYPE.ERROR
}

export function codepagereadtypetostring(codepage: MAYBE<CODE_PAGE>) {
  return codepagetypetostring(codepagereadtype(codepage))
}

export function codepagereadname(codepage: MAYBE<CODE_PAGE>) {
  const stats = codepagereadstats(codepage)
  return stats.name ?? ''
}

export function codepagereadstat(codepage: MAYBE<CODE_PAGE>, stat: string) {
  const stats = codepagereadstats(codepage)
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

export function codepageapplyelementstats(
  stats: CODE_PAGE_STATS,
  element: BOARD_ELEMENT,
) {
  const keys = Object.keys(stats)
  for (let i = 0; i < keys.length; ++i) {
    const key = keys[i]
    const value = stats[key]
    if (isarray(value)) {
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
      case 'cycle':
      case 'stepx':
      case 'stepy':
        // @ts-expect-error - we are doing this on purpose
        element[key] = stats[key]
        break
      case 'color':
      case 'bg':
      case 'lightdir':
        // @ts-expect-error - we are doing this on purpose
        element[key] = mapstrtoconsts(stats[key]) ?? stats[key]
        break
      case 'isitem':
        element.item = 1
        break
      case 'notitem':
        element.item = 0
        break
      case 'ispushable':
        element.pushable = 1
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
      case 'isbreakable':
        element.breakable = 1
        break
      case 'notbreakable':
        element.breakable = 0
        break
      default:
        // TODO: raise error for unknown stat
        break
    }
  }
}

export function codepagereaddata<T extends CODE_PAGE_TYPE>(
  codepage: MAYBE<CODE_PAGE>,
): MAYBE<CODE_PAGE_TYPE_MAP[T]> {
  if (!ispresent(codepage)) {
    return
  }
  switch (codepagereadtype(codepage)) {
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
        codepage.board = createboard()
      }
      codepage.board.id = codepage.id
      const stats = codepagereadstatdefaults(codepage)

      if (stats.isdark) {
        codepage.board.isdark = 1
      }
      if (stats.notdark) {
        codepage.board.isdark = 0
      }

      if (isnumber(stats.startx)) {
        codepage.board.startx = stats.startx
      }
      if (isnumber(stats.starty)) {
        codepage.board.starty = stats.starty
      }

      if (isstring(stats.over)) {
        if (NAME(stats.over) === 'empty') {
          codepage.board.over = undefined
        } else {
          codepage.board.over = stats.over
        }
        // reset lookup
        codepage.board.overboard = undefined
      }
      if (isstring(stats.under)) {
        if (NAME(stats.under) === 'empty') {
          codepage.board.under = undefined
        } else {
          codepage.board.under = stats.under
        }
        // reset lookup
        codepage.board.underboard = undefined
      }

      if (isstring(stats.camera)) {
        if (NAME(stats.camera) === 'empty') {
          codepage.board.camera = undefined
        } else {
          codepage.board.camera = stats.camera
        }
      }
      if (isstring(stats.graphics)) {
        if (NAME(stats.graphics) === 'empty') {
          codepage.board.graphics = undefined
        } else {
          codepage.board.graphics = stats.graphics
        }
      }
      if (isnumber(stats.facing)) {
        codepage.board.facing = stats.facing
      }
      if (isstring(stats.facing) && NAME(stats.facing) === 'empty') {
        codepage.board.facing = undefined
      }

      if (isstring(stats.exitnorth)) {
        codepage.board.exitnorth = stats.exitnorth
      }
      if (isstring(stats.exitsouth)) {
        codepage.board.exitsouth = stats.exitsouth
      }
      if (isstring(stats.exitwest)) {
        codepage.board.exitwest = stats.exitwest
      }
      if (isstring(stats.exiteast)) {
        codepage.board.exiteast = stats.exiteast
      }

      if (isnumber(stats.timelimit)) {
        codepage.board.timelimit = stats.timelimit
      }

      if (stats.restartonzap) {
        codepage.board.restartonzap = 1
      }
      if (stats.norestartonzap) {
        codepage.board.restartonzap = 0
      }

      if (isnumber(stats.maxplayershots)) {
        codepage.board.maxplayershots = stats.maxplayershots
      }

      return codepage.board as MAYBE<CODE_PAGE_TYPE_MAP[T]>
    }
    case CODE_PAGE_TYPE.OBJECT: {
      // validate and shape object into usable state
      if (!ispresent(codepage.object)) {
        codepage.object = createboardelement()
      }
      codepage.object.id = codepage.id
      codepage.object.name = codepagereadname(codepage)
      codepage.object.category = CATEGORY.ISOBJECT
      codepageapplyelementstats(
        codepagereadstatdefaults(codepage),
        codepage.object,
      )
      return codepage.object as MAYBE<CODE_PAGE_TYPE_MAP[T]>
    }
    case CODE_PAGE_TYPE.TERRAIN: {
      // validate and shape terrain into usable state
      if (!ispresent(codepage.terrain)) {
        codepage.terrain = createboardelement()
      }
      codepage.terrain.id = codepage.id
      codepage.terrain.name = codepagereadname(codepage)
      codepage.terrain.category = CATEGORY.ISTERRAIN
      codepageapplyelementstats(
        codepagereadstatdefaults(codepage),
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
        const stats = codepagereadstatdefaults(codepage)
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
      return codepage.charset as MAYBE<CODE_PAGE_TYPE_MAP[T]>
    }
  }
}
