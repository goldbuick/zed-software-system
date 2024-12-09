import { BITMAP } from 'zss/gadget/data/bitmap'
import { stat, tokenize } from 'zss/lang/lexer'
import { createsid } from 'zss/mapping/guid'
import { MAYBE, isnumber, ispresent, isstring } from 'zss/mapping/types'
import { statformat, stattypestring } from 'zss/words/stats'
import { STAT_TYPE } from 'zss/words/types'

import { createboard, exportboard, importboard } from './board'
import {
  createboardelement,
  exportboardelement,
  importboardelement,
} from './boardelement'
import { exporteighttrack, importeighttrack } from './eighttrack'
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
  return formatobject(bitmap, BITMAP_KEYS)
}

export function importbitmap(bitmapentry: MAYBE<FORMAT_OBJECT>): MAYBE<BITMAP> {
  return unformatobject(bitmapentry, BITMAP_KEYS)
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
    eighttrack: exporteighttrack,
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
    eighttrack: importeighttrack,
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

export function codepagereadstats(codepage: MAYBE<CODE_PAGE>): CODE_PAGE_STATS {
  if (!ispresent(codepage)) {
    return {}
  }

  // cached results !
  if (ispresent(codepage.stats?.type)) {
    return codepage.stats
  }

  codepage.stats = {}
  const parse = tokenize(codepage.code)

  // extract @stat lines
  let isfirst = true
  for (let i = 0; i < parse.tokens.length; ++i) {
    const token = parse.tokens[i]
    if (token.tokenType === stat) {
      const source = token.image.slice(1)
      const words = source.split(' ')
      const stat = statformat(words, isfirst)
      isfirst = false

      switch (stat.type) {
        case STAT_TYPE.LOADER:
          codepage.stats.type = CODE_PAGE_TYPE.LOADER
          codepage.stats.name = stat.values.join(' ')
          break
        case STAT_TYPE.BOARD:
          codepage.stats.type = CODE_PAGE_TYPE.BOARD
          codepage.stats.name = stat.values.join(' ')
          break
        case STAT_TYPE.OBJECT:
          codepage.stats.type = CODE_PAGE_TYPE.OBJECT
          codepage.stats.name = stat.values.join(' ')
          break
        case STAT_TYPE.TERRAIN:
          codepage.stats.type = CODE_PAGE_TYPE.TERRAIN
          codepage.stats.name = stat.values.join(' ')
          break
        case STAT_TYPE.CHARSET:
          codepage.stats.type = CODE_PAGE_TYPE.CHARSET
          codepage.stats.name = stat.values.join(' ')
          break
        case STAT_TYPE.PALETTE:
          codepage.stats.type = CODE_PAGE_TYPE.PALETTE
          codepage.stats.name = stat.values.join(' ')
          break
        case STAT_TYPE.EIGHT_TRACK:
          codepage.stats.type = CODE_PAGE_TYPE.EIGHT_TRACK
          codepage.stats.name = stat.values.join(' ')
          break
        case STAT_TYPE.CONST: {
          const [maybename, maybevalue] = stat.values
          if (isstring(maybename)) {
            const name = maybename.toLowerCase()
            if (isstring(maybevalue)) {
              // can we parse consts here ???? too ????
              const numbervalue = parseFloat(maybevalue)
              codepage.stats[name] = isnumber(numbervalue)
                ? numbervalue
                : maybevalue
            } else if (isnumber(maybevalue)) {
              codepage.stats[name] = maybevalue
            }
          }
          break
        }
        case STAT_TYPE.RANGE:
        case STAT_TYPE.SELECT:
        case STAT_TYPE.NUMBER:
        case STAT_TYPE.TEXT:
        case STAT_TYPE.LINK:
        case STAT_TYPE.HOTKEY:
        case STAT_TYPE.SCROLL: {
          const [maybename, ...args] = stat.values
          if (isstring(maybename)) {
            const name = maybename.toLowerCase()
            codepage.stats[name] = args
          }
          break
        }
      }
    }
  }

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
    case CODE_PAGE_TYPE.EIGHT_TRACK:
      return stattypestring(STAT_TYPE.EIGHT_TRACK)
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
  return (stats.name ?? '').toLowerCase()
}

export function codepagereadstat(codepage: MAYBE<CODE_PAGE>, stat: string) {
  const stats = codepagereadstats(codepage)
  return stats[stat]
}

function applyelementstats(codepage: CODE_PAGE, element: BOARD_ELEMENT) {
  const stats = codepagereadstatdefaults(codepage)
  const keys = Object.keys(stats)
  for (let i = 0; i < keys.length; ++i) {
    const key = keys[i]
    element[key as keyof BOARD_ELEMENT] = stats[key]
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
      return codepage.board as MAYBE<CODE_PAGE_TYPE_MAP[T]>
    }
    case CODE_PAGE_TYPE.OBJECT: {
      // validate and shape object into usable state
      if (!ispresent(codepage.object)) {
        codepage.object = createboardelement()
      }
      codepage.object.name = codepagereadname(codepage)
      applyelementstats(codepage, codepage.object)
      return codepage.object as MAYBE<CODE_PAGE_TYPE_MAP[T]>
    }
    case CODE_PAGE_TYPE.TERRAIN: {
      // validate and shape terrain into usable state
      if (!ispresent(codepage.terrain)) {
        codepage.terrain = createboardelement()
      }
      codepage.terrain.name = codepagereadname(codepage)
      applyelementstats(codepage, codepage.terrain)
      return codepage.terrain as MAYBE<CODE_PAGE_TYPE_MAP[T]>
    }
    case CODE_PAGE_TYPE.CHARSET: {
      // validate and shape charset into usable state
      if (!ispresent(codepage.charset)) {
        // codepage.charset = {}
      }
      return codepage.charset as MAYBE<CODE_PAGE_TYPE_MAP[T]>
    }
    case CODE_PAGE_TYPE.PALETTE: {
      // validate and shape palette into usable state
      if (!ispresent(codepage.palette)) {
        // codepage.palette = {}
      }
      return codepage.palette as MAYBE<CODE_PAGE_TYPE_MAP[T]>
    }
    case CODE_PAGE_TYPE.EIGHT_TRACK: {
      // validate and shape eighttrack into usable state
      if (!ispresent(codepage.eighttrack)) {
        // codepage.eighttrack = {}
      }
      return codepage.eighttrack as MAYBE<CODE_PAGE_TYPE_MAP[T]>
    }
  }
}
