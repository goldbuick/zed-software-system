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
  memorycreateboardelement,
  memoryexportboardelement,
  memoryimportboardelement,
} from './boardelement'
import {
  memorycreateboard,
  memoryexportboard,
  memoryimportboard,
} from './boardlifecycle'
import {
  memoryboundaryalloc,
  memoryboundaryget,
  memoryboundaryset,
} from './boundaries'
import { memoryensureboardelementruntime } from './runtimeboundary'
import {
  BITMAP_KEYS,
  BOARD,
  BOARD_ELEMENT,
  CODE_PAGE,
  CODE_PAGE_KEYS,
  CODE_PAGE_RUNTIME,
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

export function memoryreadcodepageruntime(
  codepage: MAYBE<CODE_PAGE>,
): MAYBE<CODE_PAGE_RUNTIME> {
  return memoryboundaryget<CODE_PAGE_RUNTIME>(codepage?.id ?? '')
}

export function memoryensurecodepageruntime(
  codepage: CODE_PAGE,
): CODE_PAGE_RUNTIME {
  let rt = memoryboundaryget<CODE_PAGE_RUNTIME>(codepage.id)
  if (!ispresent(rt)) {
    rt = {} as CODE_PAGE_RUNTIME
    memoryboundaryset(codepage.id, rt)
  }
  return rt
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
      case 'displayname':
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

export function memoryexportcodepage(
  codepage: MAYBE<CODE_PAGE>,
): MAYBE<FORMAT_OBJECT> {
  if (!ispresent(codepage)) {
    return undefined
  }
  const rt = memoryreadcodepageruntime(codepage) ?? ({} as CODE_PAGE_RUNTIME)
  const wire = {
    id: codepage.id,
    code: codepage.code,
    board: rt.board,
    object: rt.object,
    terrain: rt.terrain,
    charset: rt.charset,
    palette: rt.palette,
  }
  return formatobject(wire, CODE_PAGE_KEYS, {
    board: memoryexportboard,
    object: memoryexportboardelement,
    terrain: memoryexportboardelement,
    charset: memoryexportbitmap,
    palette: memoryexportbitmap,
    stats: FORMAT_SKIP,
  })
}

export function memorycodepagehasmatch(
  codepage: MAYBE<CODE_PAGE>,
  type: CODE_PAGE_TYPE,
  ids: string[],
): boolean {
  if (!ispresent(codepage) || memoryreadcodepagetype(codepage) !== type) {
    return false
  }
  if (ids.some((id) => id === codepage.id)) {
    return true
  }
  return false
}

type IMPORTED_CODE_PAGE_WIRE = {
  id: string
  code: string
  board?: BOARD
  object?: BOARD_ELEMENT
  terrain?: BOARD_ELEMENT
  charset?: BITMAP
  palette?: BITMAP
}

export function memoryimportcodepage(
  codepageentry: MAYBE<FORMAT_OBJECT>,
): MAYBE<CODE_PAGE> {
  if (!ispresent(codepageentry)) {
    return undefined
  }
  const flat = unformatobject<IMPORTED_CODE_PAGE_WIRE>(
    codepageentry,
    CODE_PAGE_KEYS,
    {
      board: memoryimportboard,
      object: memoryimportboardelement,
      terrain: memoryimportboardelement,
      charset: memoryimportbitmap,
      palette: memoryimportbitmap,
    },
  )
  if (!ispresent(flat)) {
    return undefined
  }
  const rt: CODE_PAGE_RUNTIME = {}
  if (ispresent(flat.board)) {
    rt.board = flat.board
  }
  if (ispresent(flat.object)) {
    rt.object = flat.object
  }
  if (ispresent(flat.terrain)) {
    rt.terrain = flat.terrain
  }
  if (ispresent(flat.charset)) {
    rt.charset = flat.charset
  }
  if (ispresent(flat.palette)) {
    rt.palette = flat.palette
  }
  memoryboundaryalloc(rt, flat.id)
  return {
    id: flat.id,
    code: flat.code,
  }
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
    case CODE_PAGE_TYPE.BOARD: {
      const rt = memoryensurecodepageruntime(codepage)
      if (!ispresent(rt.board)) {
        rt.board = memorycreateboard()
      }

      rt.board.id = codepage.id
      rt.board.name = memoryreadcodepagename(codepage)
      // unpack stats into board data
      const stats = memoryreadcodepagestatdefaults(codepage)
      const keys = Object.keys(stats)
      for (let i = 0; i < keys.length; ++i) {
        const key = keys[i]
        const value = stats[key]
        switch (key) {
          case 'isdark':
            rt.board.isdark = 1
            break
          case 'notdark':
            rt.board.isdark = 0
            break
          case 'restartonzap':
            rt.board.restartonzap = 1
            break
          case 'norestartonzap':
            rt.board.restartonzap = 0
            break
          case 'startx':
          case 'starty':
          case 'facing':
          case 'timelimit':
          case 'maxplayershots':
            if (isnumber(value)) {
              rt.board[key] = value
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
                rt.board[key] = undefined
              } else {
                rt.board[key] = value
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
              rt.board[key] = mapstrtoconsts(value) ?? value
            }
            break
        }
      }
      return rt.board as MAYBE<CODE_PAGE_TYPE_MAP[T]>
    }
    case CODE_PAGE_TYPE.OBJECT: {
      const rt = memoryensurecodepageruntime(codepage)
      if (!ispresent(rt.object)) {
        rt.object = memorycreateboardelement()
      }
      rt.object.id = codepage.id
      rt.object.code = codepage.code
      rt.object.name = memoryreadcodepagename(codepage)
      memoryensureboardelementruntime(rt.object).category = CATEGORY.ISOBJECT
      memoryapplyelementstats(
        memoryreadcodepagestatdefaults(codepage),
        rt.object,
      )
      return rt.object as MAYBE<CODE_PAGE_TYPE_MAP[T]>
    }
    case CODE_PAGE_TYPE.TERRAIN: {
      const rt = memoryensurecodepageruntime(codepage)
      if (!ispresent(rt.terrain)) {
        rt.terrain = memorycreateboardelement()
      }
      rt.terrain.id = codepage.id
      rt.terrain.code = codepage.code
      rt.terrain.name = memoryreadcodepagename(codepage)
      memoryensureboardelementruntime(rt.terrain).category = CATEGORY.ISTERRAIN
      memoryapplyelementstats(
        memoryreadcodepagestatdefaults(codepage),
        rt.terrain,
      )
      return rt.terrain as MAYBE<CODE_PAGE_TYPE_MAP[T]>
    }
    case CODE_PAGE_TYPE.PALETTE: {
      const rt = memoryensurecodepageruntime(codepage)
      if (!ispresent(rt.palette)) {
        // clone default
        rt.palette = loadpalettefrombytes(PALETTE)
      }
      if (ispresent(rt.palette?.bits)) {
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
              rt.palette.bits[row + 0] = clamp(cpr, 0, 63)
              rt.palette.bits[row + 1] = clamp(cpg, 0, 63)
              rt.palette.bits[row + 2] = clamp(cpb, 0, 63)
            }
          }
        }
      }
      return rt.palette as MAYBE<CODE_PAGE_TYPE_MAP[T]>
    }
    case CODE_PAGE_TYPE.CHARSET: {
      const rt = memoryensurecodepageruntime(codepage)
      if (!ispresent(rt.charset)) {
        // clone default
        rt.charset = loadcharsetfrombytes(CHARSET)
      }
      if (ispresent(rt.charset?.bits)) {
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
              writecharfrombytes(Uint8Array.from(pixels), rt.charset, idx)
            }
          }
        }
      }
      return rt.charset as MAYBE<CODE_PAGE_TYPE_MAP[T]>
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
  }
}

export function memorycreatecodepage(
  code: string,
  content: Partial<Omit<CODE_PAGE, 'id' | 'code'>> & Partial<CODE_PAGE_RUNTIME>,
): CODE_PAGE {
  const { stats, board, object, terrain, charset, palette } = content
  const id = createsid()
  const rt: CODE_PAGE_RUNTIME = {}
  if (ispresent(board)) {
    rt.board = board
  }
  if (ispresent(object)) {
    rt.object = object
  }
  if (ispresent(terrain)) {
    rt.terrain = terrain
  }
  if (ispresent(charset)) {
    rt.charset = charset
  }
  if (ispresent(palette)) {
    rt.palette = palette
  }
  memoryboundaryalloc(rt, id)
  return {
    id,
    code,
    stats,
  }
}
