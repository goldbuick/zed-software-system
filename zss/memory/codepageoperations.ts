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
import { stat, tokenize } from 'zss/feature/lang/backend/typescript/lexer'
import { PALETTE } from 'zss/feature/palette'
import { BITMAP } from 'zss/gadget/data/bitmap'
import { FILE_BYTES_PER_COLOR } from 'zss/gadget/data/types'
import { createsid } from 'zss/mapping/guid'
import { clamp } from 'zss/mapping/number'
import {
  MAYBE,
  isarray,
  isnumber,
  ispresent,
  isstring,
} from 'zss/mapping/types'
import {
  isstrcolor,
  mapstrcolor,
  mapstrcolortoattributes,
  readcolor,
} from 'zss/words/color'
import { READ_CONTEXT } from 'zss/words/reader'
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
  memorycreateboardelement,
  memoryexportboardelement,
  memoryimportboardelement,
} from './boardelement'
import {
  memorycreateboard,
  memoryexportboard,
  memoryimportboard,
} from './boardlifecycle'
import { remapcodepageidsforfilenamesafety } from './bookidremap'
import { memoryinvalidatecodepagepickcache } from './codepagepickcache'
import {
  memoryparsedirstatvalue,
  memorywritedeltadirstat,
} from './deltadirstat'
import { memoryparselightstatvalue, memorywritelightstat } from './lightstat'
import {
  BITMAP_KEYS,
  BOARD,
  BOARD_ELEMENT,
  CODE_PAGE,
  CODE_PAGE_KEYS,
  CODE_PAGE_STATS,
  CODE_PAGE_TYPE,
  CODE_PAGE_TYPE_MAP,
} from './types'

/** Parses `#rgb` / `#rrggbb` / `rgb(r,g,b)` into linear 0–1 components (worker-safe). */
function parsecsscolortonormalizedrgb(
  value: string,
): { r: number; g: number; b: number } | undefined {
  const v = value.trim()
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(v)
  if (hex) {
    let h = hex[1]
    if (h.length === 3) {
      h = `${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`
    }
    return {
      r: parseInt(h.slice(0, 2), 16) / 255,
      g: parseInt(h.slice(2, 4), 16) / 255,
      b: parseInt(h.slice(4, 6), 16) / 255,
    }
  }
  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(v)
  if (rgb) {
    return {
      r: Number(rgb[1]) / 255,
      g: Number(rgb[2]) / 255,
      b: Number(rgb[3]) / 255,
    }
  }
  return undefined
}

export function memoryapplyelementstats(
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
        case 'dir':
          // step/shoot dir widgets drive stepx/stepy (shootx/shooty) live
          if (key === 'step' || key === 'shoot') {
            break
          }
          if (!ispresent(element[key as keyof BOARD_ELEMENT])) {
            element[key as keyof BOARD_ELEMENT] = 'north'
          }
          break
      }
      // non-const stats here don't make sense
      continue
    }
    switch (key) {
      case 'name':
      case 'char':
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
      case 'p11':
      case 'p12':
      case 'p13':
      case 'p14':
      case 'p15':
      case 'p16':
      case 'p17':
      case 'p18':
      case 'p19':
      case 'p20':
      case 'cycle':
      case 'stepx':
      case 'stepy':
      case 'shootx':
      case 'shooty':
      case 'lightsteps':
      case 'lightx':
      case 'lighty':
      case 'displaychar':
      case 'displayname':
        element[key as keyof BOARD_ELEMENT] = value
        break
      case 'light': {
        const parsed = memoryparselightstatvalue(value)
        if (ispresent(parsed)) {
          // @light always applies cone: bare radius → circle (0,0)
          memorywritelightstat(
            undefined,
            element,
            parsed.radius,
            parsed.dirwords,
            true,
          )
        }
        break
      }
      case 'step': {
        const dirwords = memoryparsedirstatvalue(value)
        if (ispresent(dirwords)) {
          memorywritedeltadirstat(
            undefined,
            element,
            dirwords,
            'stepx',
            'stepy',
          )
        }
        break
      }
      case 'shoot': {
        const dirwords = memoryparsedirstatvalue(value)
        if (ispresent(dirwords)) {
          memorywritedeltadirstat(
            undefined,
            element,
            dirwords,
            'shootx',
            'shooty',
          )
        }
        break
      }
      case 'color':
      case 'displaycolor': {
        if (isnumber(value)) {
          element[key as keyof BOARD_ELEMENT] = value
          break
        }
        if (isstring(value)) {
          const prevwords = READ_CONTEXT.words
          READ_CONTEXT.words = value.trim().split(/\s+/).filter(Boolean)
          const [strcolor] = readcolor(0)
          READ_CONTEXT.words = prevwords
          if (isstrcolor(strcolor)) {
            const { color, bg } = mapstrcolortoattributes(strcolor)
            if (key === 'color') {
              if (ispresent(color)) {
                element.color = color
              }
              if (ispresent(bg)) {
                element.bg = bg
              }
            } else {
              if (ispresent(color)) {
                element.displaycolor = color
              }
              if (ispresent(bg)) {
                element.displaybg = bg
              }
            }
            break
          }
        }
        // @ts-expect-error - we are doing this on purpose
        element[key] = mapstrtoconsts(value) ?? value
        break
      }
      case 'bg':
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

export function memoryexportbitmap(
  bitmap: MAYBE<BITMAP>,
): MAYBE<FORMAT_OBJECT> {
  return formatobject(bitmap, BITMAP_KEYS, {
    bits: (bits: Uint8Array) => Array.from(bits),
  })
}

export function memoryimportbitmap(
  bitmapentry: MAYBE<FORMAT_OBJECT>,
): MAYBE<BITMAP> {
  return unformatobject(bitmapentry, BITMAP_KEYS, {
    bits: (bits: number[]) => new Uint8Array(bits),
  })
}

export type MEMORY_CODEPAGE_IO_OPTIONS = {
  format?: 'wire' | 'json'
  strip?: boolean
}

export function memoryexportcodepage(
  codepage: MAYBE<CODE_PAGE>,
  options?: MEMORY_CODEPAGE_IO_OPTIONS,
): MAYBE<FORMAT_OBJECT | Record<string, unknown>> {
  if (!ispresent(codepage)) {
    return undefined
  }
  const format = options?.format ?? 'wire'
  const strip = options?.strip === true
  if (format === 'json') {
    return {
      id: codepage.id,
      code: codepage.code,
      board: memoryexportboard(codepage.board, { format: 'json', strip }),
      object: memoryexportboardelement(codepage.object, { format: 'json' }),
      terrain: memoryexportboardelement(codepage.terrain, { format: 'json' }),
      charset: memoryexportbitmap(codepage.charset),
      palette: memoryexportbitmap(codepage.palette),
    }
  }
  return formatobject(codepage, CODE_PAGE_KEYS, {
    board: (board) => memoryexportboard(board, { strip }),
    object: memoryexportboardelement,
    terrain: memoryexportboardelement,
    charset: memoryexportbitmap,
    palette: memoryexportbitmap,
    stats: FORMAT_SKIP,
  })
}

type CODE_PAGE_WIRE = {
  id: string
  code: string
  board?: BOARD
  object?: BOARD_ELEMENT
  terrain?: BOARD_ELEMENT
  charset?: BITMAP
  palette?: BITMAP
}

function memorynormalizeimportedcodepage(flat: any): MAYBE<CODE_PAGE> {
  if (!ispresent(flat)) {
    return undefined
  }
  const page = remapcodepageidsforfilenamesafety(flat)
  if (page.board && typeof page.board === 'object') {
    const board = page.board as { id?: string; objects?: unknown }
    board.id = page.id
    if (!board.objects || typeof board.objects !== 'object') {
      board.objects = {}
    }
  }
  return {
    id: page.id,
    code: page.code,
    board: page.board,
    object: page.object,
    terrain: page.terrain,
    charset: page.charset,
    palette: page.palette,
  }
}

export function memoryimportcodepage(
  codepage: MAYBE<FORMAT_OBJECT | Record<string, unknown>>,
  options?: MEMORY_CODEPAGE_IO_OPTIONS,
): MAYBE<CODE_PAGE> {
  if (!ispresent(codepage)) {
    return undefined
  }
  const format = options?.format ?? 'wire'
  if (format === 'json') {
    return memorynormalizeimportedcodepage(codepage)
  }
  const flat = unformatobject<CODE_PAGE_WIRE>(
    codepage as MAYBE<FORMAT_OBJECT>,
    CODE_PAGE_KEYS,
    {
      board: (board) => memoryimportboard(board),
      object: memoryimportboardelement,
      terrain: memoryimportboardelement,
      charset: memoryimportbitmap,
      palette: memoryimportbitmap,
    },
  )
  return memorynormalizeimportedcodepage(flat)
}

export function memoryfreecodepage(codepage: MAYBE<CODE_PAGE>) {
  if (!ispresent(codepage)) {
    return
  }
  codepage.board = undefined
  codepage.object = undefined
  codepage.terrain = undefined
  codepage.charset = undefined
  codepage.palette = undefined
}

export function memoryreadcodepagedata<T extends CODE_PAGE_TYPE>(
  codepage: MAYBE<CODE_PAGE>,
): MAYBE<CODE_PAGE_TYPE_MAP[T]> {
  if (!ispresent(codepage)) {
    return
  }
  switch (memoryreadcodepagetype(codepage)) {
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
    case CODE_PAGE_TYPE.TXT: {
      return (codepage.code ?? '') as MAYBE<CODE_PAGE_TYPE_MAP[T]>
    }
    case CODE_PAGE_TYPE.BOARD: {
      if (!ispresent(codepage.board)) {
        codepage.board = memorycreateboard()
      }

      codepage.board.id = codepage.id
      codepage.board.name = memoryreadcodepagename(codepage)
      // unpack stats into board data
      const stats = memoryreadcodepagestatdefaults(codepage)
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
      if (!ispresent(codepage.object)) {
        codepage.object = memorycreateboardelement()
      }
      codepage.object.id = codepage.id
      codepage.object.code = codepage.code
      codepage.object.name = memoryreadcodepagename(codepage)
      codepage.object.category = CATEGORY.ISOBJECT
      memoryapplyelementstats(
        memoryreadcodepagestatdefaults(codepage),
        codepage.object,
      )
      return codepage.object as MAYBE<CODE_PAGE_TYPE_MAP[T]>
    }
    case CODE_PAGE_TYPE.TERRAIN: {
      if (!ispresent(codepage.terrain)) {
        codepage.terrain = memorycreateboardelement()
      }
      codepage.terrain.id = codepage.id
      codepage.terrain.code = codepage.code
      codepage.terrain.name = memoryreadcodepagename(codepage)
      codepage.terrain.category = CATEGORY.ISTERRAIN
      memoryapplyelementstats(
        memoryreadcodepagestatdefaults(codepage),
        codepage.terrain,
      )
      return codepage.terrain as MAYBE<CODE_PAGE_TYPE_MAP[T]>
    }
    case CODE_PAGE_TYPE.PALETTE: {
      if (!ispresent(codepage.palette)) {
        // clone default
        codepage.palette = loadpalettefrombytes(PALETTE)
      }
      if (ispresent(codepage.palette?.bits)) {
        const stats = memoryreadcodepagestatdefaults(codepage)
        const statnames = objectKeys(stats)
        for (let i = 0; i < statnames.length; ++i) {
          const statname = statnames[i].toLowerCase()
          const statvalue = stats[statname]
          if (statname.startsWith('color') && isstring(statvalue)) {
            const idx = parseFloat(statname.replace('color', ''))
            if (idx >= 0 && idx <= 15) {
              const parsed = parsecsscolortonormalizedrgb(statvalue)
              if (!ispresent(parsed)) {
                continue
              }
              const row = idx * FILE_BYTES_PER_COLOR
              const cpr = parsed.r * 63
              const cpg = parsed.g * 63
              const cpb = parsed.b * 63
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
      if (!ispresent(codepage.charset)) {
        // clone default
        codepage.charset = loadcharsetfrombytes(CHARSET)
      }
      if (ispresent(codepage.charset?.bits)) {
        const stats = memoryreadcodepagestatdefaults(codepage)
        const statnames = objectKeys(stats)
        for (let i = 0; i < statnames.length; ++i) {
          const statname = statnames[i].toLowerCase()
          const statvalue = stats[statname]
          if (statname.startsWith('char') && isarray(statvalue)) {
            const idx = parseFloat(statname.replace('char', ''))
            if (idx >= 0 && idx <= 255) {
              const allrows = statvalue.join('')
              const SIZE = 8 * 14
              const pixels: number[] = []
              for (let i = 0; i < SIZE; ++i) {
                const pixel = allrows[i]
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

export function memoryreadcodepagename(codepage: MAYBE<CODE_PAGE>) {
  const stats = memoryreadcodepagestats(codepage)
  return stats.name ?? ''
}

export function memoryreadcodepagestat(
  codepage: MAYBE<CODE_PAGE>,
  stat: string,
) {
  const stats = memoryreadcodepagestats(codepage)
  return stats[stat]
}

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

export function memoryreadcodepagestatdefaults(
  codepage: MAYBE<CODE_PAGE>,
): CODE_PAGE_STATS {
  const stats = { ...memoryreadcodepagestats(codepage) }

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

export function memoryreadcodepagestats(
  codepage: MAYBE<CODE_PAGE>,
): CODE_PAGE_STATS {
  if (!ispresent(codepage)) {
    return {}
  }

  // cached results !
  if (ispresent(codepage.stats?.type)) {
    return codepage.stats
  }

  codepage.stats = memoryreadcodepagestatsfromtext(codepage.code)

  // default to object type
  if (!ispresent(codepage.stats.type)) {
    codepage.stats.type = CODE_PAGE_TYPE.OBJECT
  }

  // results !
  return codepage.stats
}

export function memoryreadcodepagestatsfromtext(
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
        case STAT_TYPE.TXT:
          stats.type = CODE_PAGE_TYPE.TXT
          stats.name = maybename
          break
        case STAT_TYPE.CONST: {
          const [maybename, ...maybevalues] = stat.values
          if (isstring(maybename)) {
            const name = NAME(maybename)
            const maybevalue = maybevalues.join(' ')
            if (isstring(maybevalue)) {
              const numbervalue = parseFloat(maybevalue)
              // Multi-word consts (e.g. `@light 6 n`) must stay strings; parseFloat("6 n") === 6.
              if (maybevalues.length === 1 && isnumber(numbervalue)) {
                stats[name] = numbervalue
              } else {
                if (!ispresent(stats[name])) {
                  stats[name] = maybevalue
                } else {
                  if (!isarray(stats[name])) {
                    const current = stats[name]
                    stats[name] = [current]
                  }
                  stats[name].push(maybevalue)
                }
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
        case STAT_TYPE.DIR:
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

export function memoryreadcodepagetype(codepage: MAYBE<CODE_PAGE>) {
  const stats = memoryreadcodepagestats(codepage)
  return stats.type ?? CODE_PAGE_TYPE.ERROR
}

export function memoryreadcodepagetypeasstring(codepage: MAYBE<CODE_PAGE>) {
  return memorycodepagetypetostring(memoryreadcodepagetype(codepage))
}

export function memoryresetcodepagestats(
  codepage: MAYBE<CODE_PAGE>,
): CODE_PAGE_STATS {
  if (!ispresent(codepage)) {
    return {}
  }
  codepage.stats = undefined
  memoryinvalidatecodepagepickcache()
  return memoryreadcodepagestats(codepage)
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
    case CODE_PAGE_TYPE.TXT:
      return stattypestring(STAT_TYPE.TXT)
  }
}

export function memorycreatecodepage(
  code: string,
  content: Partial<Omit<CODE_PAGE, 'id' | 'code'>>,
): CODE_PAGE {
  const { stats, board, object, terrain, charset, palette } = content
  return {
    id: createsid(),
    code,
    stats,
    board,
    object,
    terrain,
    charset,
    palette,
  }
}
