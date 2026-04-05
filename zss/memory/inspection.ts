import { objectKeys } from 'ts-extras'
import { parsetarget } from 'zss/device'
import {
  gadgetserverclearscroll,
  registercopy,
  registereditoropen,
  vmcodeaddress,
} from 'zss/device/api'
import { modemwriteinitstring } from 'zss/device/modem'
import { SOFTWARE } from 'zss/device/session'
import { DIVIDER } from 'zss/feature/zsstextui'
import { codepagepicksuffix } from 'zss/firmware/cli/utils'
import { registerhyperlinksharedbridge } from 'zss/gadget/data/api'
import { scrollwritelines } from 'zss/gadget/data/scrollwritelines'
import { ptstoarea, rectpoints } from 'zss/mapping/2d'
import { range } from 'zss/mapping/array'
import { doasync } from 'zss/mapping/func'
import { scrolllinkescapefrag } from 'zss/mapping/string'
import { CYCLE_DEFAULT, waitfor } from 'zss/mapping/tick'
import {
  MAYBE,
  isarray,
  isnumber,
  ispresent,
  isstring,
} from 'zss/mapping/types'
import { CATEGORY, COLLISION, NAME, PT, WORD } from 'zss/words/types'

import {
  memoryboardelementindex,
  memoryreadelement,
  memoryreadelementbyidorindex,
} from './boardaccess'
import { memoryboardelementisobject } from './boardelement'
import { memorysafedeleteelement, memorywriteterrain } from './boardlifecycle'
import { memoryinitboard, memoryreadelementstat } from './boards'
import { memoryreadelementcodepage } from './bookoperations'
import { memoryensuresoftwarebook } from './books'
import {
  memoryreadcodepagename,
  memoryreadcodepagestatdefaults,
  memoryreadcodepagetypeasstring,
} from './codepageoperations'
import { memorypickcodepagewithtypeandstat } from './codepages'
import { memoryhassecretheap } from './inspectionbatch'
import { memoryloadermatches } from './loader'
import { memoryreadplayerboard } from './playermanagement'
import {
  memorycodepagetoprefix,
  memoryelementtodisplayprefix,
} from './rendering'
import { memoryreadbookbysoftware, memoryreadoperator } from './session'
import {
  BOARD,
  BOARD_ELEMENT,
  CODE_PAGE,
  CODE_PAGE_TYPE,
  MEMORY_LABEL,
} from './types'

function chipfromelement(board: MAYBE<BOARD>, element: MAYBE<BOARD_ELEMENT>) {
  const id = element?.id ?? memoryboardelementindex(board, element)
  return `inspect:${id}`
}

function memoryinspectjoinlinkwords(words: WORD[]): string {
  return words
    .map((w) => {
      if (isarray(w)) {
        return memoryinspectjoinlinkwords(w as unknown as WORD[])
      }
      const s = `${w ?? ''}`
      if (/\s/.test(s) || s.length === 0) {
        return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
      }
      return s
    })
    .join(' ')
}

export function memoryinspectboardlines(board: string): string[] {
  const boardcodepage = memorypickcodepagewithtypeandstat(
    CODE_PAGE_TYPE.BOARD,
    board,
  )
  const boardname = memoryreadcodepagename(boardcodepage)
  const copylabel = scrolllinkescapefrag(`board id ${board}`)
  return [
    `!@batch pageopen:${board};edit $blue[board] $white${boardname}`,
    `!@batch istargetless copyit ${board};${copylabel}`,
  ]
}

export function memoryinspectloaderlines(p1: PT, p2: PT): string[] {
  const loaders = memoryloadermatches('text', 'gadget:action')
  if (!loaders.length) {
    return []
  }
  const area = ptstoarea(p1, p2)
  const lines = []
  for (let i = 0; i < loaders.length; ++i) {
    const codepage = loaders[i]
    const name = memoryreadcodepagename(codepage)
    lines.push(
      `!@gadget action "" ${codepage.id} ${area};${scrolllinkescapefrag(`run ${name}`)}`,
    )
  }
  return lines
}

export async function memoryinspect(player: string, p1: PT, p2: PT) {
  const mainbook = memoryensuresoftwarebook(MEMORY_LABEL.MAIN)
  const showpaste = await memoryhassecretheap()
  if (!ispresent(mainbook)) {
    return
  }

  const board = memoryreadplayerboard(player)
  if (!ispresent(board)) {
    return
  }

  // ensure lookup
  memoryinitboard(board)

  // one element, or many ?
  if (p1.x === p2.x && p1.y === p2.y) {
    const element = memoryreadelement(board, p1, true)
    const codepage = memoryreadelementcodepage(mainbook, element)
    // found element def
    if (ispresent(element) && ispresent(codepage)) {
      memoryinspectelement(
        player,
        board,
        codepage,
        element,
        p1,
        memoryboardelementisobject(element),
      )
      return
    }
    if (!element?.kind) {
      const emptylines = [
        `empty: ${p1.x}, ${p1.y}`,
        DIVIDER,
        `!@empty copycoords:${p1.x},${p1.y} hk 5 " 5 ";copy coords`,
        ...memoryinspectloaderlines(p1, p2),
        ...memoryinspectboardlines(board.id),
      ]
      scrollwritelines(player, 'inspect', emptylines.join('\n'), 'refscroll')
      return
    }
  } else {
    memoryinspectarea(player, p1, p2, showpaste)
    return
  }
}

export function memoryinspectarea(
  player: string,
  p1: PT,
  p2: PT,
  memoryhassecretheap: boolean,
) {
  const mainbook = memoryensuresoftwarebook(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }

  const board = memoryreadplayerboard(player)
  if (!ispresent(board)) {
    return
  }

  let group = 0
  const area = ptstoarea(p1, p2)
  const groupchip = `groups:${area}`

  registerhyperlinksharedbridge(
    groupchip,
    'select',
    (target) => {
      if (target === 'group') {
        return group
      }
      return 0
    },
    (name, value) => {
      if (name === 'group' && isnumber(value)) {
        group = value
        rectpoints(p1.x, p1.y, p2.x, p2.y).forEach((pt) => {
          const el = memoryreadelement(board, pt)
          if (ispresent(el)) {
            el[name as keyof BOARD_ELEMENT] = `group${value}`
          }
        })
      }
    },
  )

  const grouptokens = [
    'group',
    'select',
    'none',
    '0',
    ...range(1, 127)
      .map((i) => [`group${i}`, `${i}`])
      .flat(),
  ]
  const groupline = `!${grouptokens.join(' ')};group`

  const lines: string[] = [
    `selected: ${p1.x},${p1.y} - ${p2.x},${p2.y}`,
    DIVIDER,
    `!@batch copy:${area} hk 1 " 1 " next;copy elements`,
    `!@batch cut:${area} hk 2 " 2 " next;cut elements`,
  ]
  if (memoryhassecretheap) {
    lines.push(`!@batch paste:${area} hk 3 " 3 " next;paste elements`)
  }
  lines.push(`!@batch copycoords:${area} hk 5 " 5 ";copy coords`)
  if (memoryhassecretheap) {
    lines.push(`!@batch style:${area} hk s " S " next;style transfer`)
  }
  lines.push(
    `!@remix remix:${area} hk r " R " next;remix coords`,
    DIVIDER,
    `!@batch chars:${area} hk a " A " next;set chars:`,
    `!@batch colors:${area} hk c " C " next;set colors:`,
    `!@batch bgs:${area} hk b " B " next;set bgs:`,
    `!@batch empty:${area} hk 0 " 0 " next;make empty`,
    DIVIDER,
    groupline,
    ...memoryinspectloaderlines(p1, p2),
  )

  const x1 = Math.min(p1.x, p2.x)
  const y1 = Math.min(p1.y, p2.y)
  const x2 = Math.max(p1.x, p2.x)
  const y2 = Math.max(p1.y, p2.y)
  const ids = new Set<string>()
  for (let y = y1; y <= y2; ++y) {
    for (let x = x1; x <= x2; ++x) {
      const element = memoryreadelement(board, { x, y })
      const codepage = memoryreadelementcodepage(mainbook, element)
      if (ispresent(codepage) && !ids.has(codepage.id)) {
        ids.add(codepage.id)
        const name = memoryreadcodepagename(codepage)
        const type = memoryreadcodepagetypeasstring(codepage)
        const prefix = memorycodepagetoprefix(codepage)
        lines.push(
          `!@batch pageopen:${codepage.id};edit $blue[${type}] ${prefix}$white${name}${codepagepicksuffix(codepage)}`,
        )
      }
    }
  }

  lines.push(...memoryinspectboardlines(board.id))

  scrollwritelines(player, 'inspect', lines.join('\n'), groupchip)
}

export function memoryinspectbgarea(
  player: string,
  p1: PT,
  p2: PT,
  name: string,
) {
  const board = memoryreadplayerboard(player)
  if (!ispresent(board)) {
    return
  }

  let all = 0
  const batchchip = `batch:${ptstoarea(p1, p2)}`
  registerhyperlinksharedbridge(
    batchchip,
    'bgedit',
    () => all,
    (field, value) => {
      if (isnumber(value)) {
        all = value
        rectpoints(p1.x, p1.y, p2.x, p2.y).forEach((pt) => {
          const el = memoryreadelement(board, pt)
          if (ispresent(el)) {
            el[field as keyof BOARD_ELEMENT] = value
          }
        })
      }
    },
  )

  const lines = [
    `batch chars: ${p1.x},${p1.y} - ${p2.x},${p2.y}`,
    DIVIDER,
    `!${name} bgedit;bg`,
  ]
  scrollwritelines(player, 'bulk set bg', lines.join('\n'), batchchip)
}

export function memoryinspectchar(
  player: string,
  element: BOARD_ELEMENT,
  name: string,
) {
  const mainbook = memoryensuresoftwarebook(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }

  const board = memoryreadplayerboard(player)
  if (!ispresent(board)) {
    return
  }

  function get(target: string): WORD {
    const value =
      element?.[target as keyof BOARD_ELEMENT] ??
      element?.kinddata?.[target as keyof BOARD_ELEMENT] ??
      0
    return value
  }
  function set(field: string, value: WORD) {
    if (ispresent(element)) {
      element[field as keyof BOARD_ELEMENT] = value
    }
  }

  const strcategory =
    element.category === CATEGORY.ISTERRAIN ? 'terrain' : 'object'
  const strname = element.name ?? element.kind ?? 'ERR'
  const strpos = `${element.x ?? -1}, ${element.y ?? -1}`
  const chip = chipfromelement(board, element)

  registerhyperlinksharedbridge(chip, 'charedit', get, set)

  const lines = [
    `${strcategory}: ${strname} ${strpos}`,
    DIVIDER,
    `!${name} charedit;char`,
  ]
  scrollwritelines(player, 'char', lines.join('\n'), chip)
}

export function memoryinspectchararea(
  player: string,
  p1: PT,
  p2: PT,
  name: string,
) {
  const board = memoryreadplayerboard(player)
  if (!ispresent(board)) {
    return
  }

  let all = 0
  const batchchip = `batch:${ptstoarea(p1, p2)}`
  registerhyperlinksharedbridge(
    batchchip,
    'charedit',
    () => all,
    (field, value) => {
      if (isnumber(value)) {
        all = value
        rectpoints(p1.x, p1.y, p2.x, p2.y).forEach((pt) => {
          const el = memoryreadelement(board, pt)
          if (ispresent(el)) {
            el[field as keyof BOARD_ELEMENT] = value
          }
        })
      }
    },
  )

  const lines = [
    `batch chars: ${p1.x},${p1.y} - ${p2.x},${p2.y}`,
    DIVIDER,
    `!${name} charedit;char`,
  ]
  scrollwritelines(player, 'bulk set char', lines.join('\n'), batchchip)
}

export function memoryinspectcolor(
  player: string,
  element: BOARD_ELEMENT,
  name: string,
) {
  const mainbook = memoryensuresoftwarebook(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }

  const board = memoryreadplayerboard(player)
  if (!ispresent(board)) {
    return
  }

  function get(target: string): WORD {
    const value =
      element?.[target as keyof BOARD_ELEMENT] ??
      element?.kinddata?.[target as keyof BOARD_ELEMENT] ??
      0
    return value
  }
  function set(field: string, value: WORD) {
    if (ispresent(element)) {
      element[field as keyof BOARD_ELEMENT] = value
    }
  }

  const strcategory =
    element.category === CATEGORY.ISTERRAIN ? 'terrain' : 'object'
  const strname = element.name ?? element.kind ?? 'ERR'
  const strpos = `${element.x ?? -1}, ${element.y ?? -1}`
  const chip = chipfromelement(board, element)
  const edittype = name === 'bg' ? 'bgedit' : 'coloredit'

  registerhyperlinksharedbridge(chip, edittype, get, set)

  const lines = [
    `${strcategory}: ${strname} ${strpos}`,
    DIVIDER,
    `!${name} ${edittype};color`,
  ]
  scrollwritelines(player, name, lines.join('\n'), chip)
}

export function memoryinspectcolorarea(
  player: string,
  p1: PT,
  p2: PT,
  name: string,
) {
  const board = memoryreadplayerboard(player)
  if (!ispresent(board)) {
    return
  }

  let all = 0
  const batchchip = `batch:${ptstoarea(p1, p2)}`
  registerhyperlinksharedbridge(
    batchchip,
    'coloredit',
    () => all,
    (field, value) => {
      if (isnumber(value)) {
        all = value
        for (let y = p1.y; y <= p2.y; ++y) {
          for (let x = p1.x; x <= p2.x; ++x) {
            const el = memoryreadelement(board, { x, y })
            if (ispresent(el)) {
              el[field as keyof BOARD_ELEMENT] = value
            }
          }
        }
      }
    },
  )

  const lines = [
    `batch chars: ${p1.x},${p1.y} - ${p2.x},${p2.y}`,
    DIVIDER,
    `!${name} coloredit;color`,
  ]
  scrollwritelines(player, 'bulk set color', lines.join('\n'), batchchip)
}

export function memoryinspectcommand(path: string, player: string) {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }
  const board = memoryreadplayerboard(player)
  if (!ispresent(board)) {
    return
  }
  const inspect = parsetarget(path)
  const element = memoryreadelementbyidorindex(board, inspect.target)
  if (!ispresent(element)) {
    return
  }
  switch (inspect.path) {
    case 'copycoords':
      registercopy(
        SOFTWARE,
        memoryreadoperator(),
        [element.x ?? 0, element.y ?? 0].join(' '),
      )
      break
    case 'bg':
    case 'color':
      memoryinspectcolor(player, element, inspect.path)
      break
    case 'char':
      memoryinspectchar(player, element, inspect.path)
      break
    case 'empty':
      memorysafedeleteelement(board, element, mainbook.timestamp)
      break
    case 'code':
      doasync(SOFTWARE, player, async () => {
        const pagetype = 'object'

        // edit path
        const path = [board.id, element.id]

        // write to modem
        modemwriteinitstring(
          vmcodeaddress(mainbook.id, path),
          element.code ?? '',
        )

        // close scroll
        gadgetserverclearscroll(SOFTWARE, player)

        // wait a little
        await waitfor(800)

        // open code editor
        const prefix = memoryelementtodisplayprefix(element)
        const title = `${prefix}$ONCLEAR$GREEN ${element.name ?? element.kind ?? '??'} - ${mainbook.name}`
        registereditoropen(SOFTWARE, player, mainbook.id, path, pagetype, title)
      })
      break
    default:
      console.info('unknown inspect', inspect)
      break
  }
}

export function memoryinspectelement(
  player: string,
  board: BOARD,
  codepage: CODE_PAGE,
  element: BOARD_ELEMENT,
  p1: PT,
  isobject: boolean,
) {
  const mainbook = memoryensuresoftwarebook(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }

  function get(name: string): WORD {
    const value =
      element?.[name as keyof BOARD_ELEMENT] ??
      element?.kinddata?.[name as keyof BOARD_ELEMENT]

    if (name === 'group') {
      return parseFloat(element.group?.replace('group', '') ?? '0')
    }

    if (!ispresent(value)) {
      switch (name) {
        case 'color':
          return 15
        case 'bg':
          return 0
        case 'group':
          return 0
        case 'cycle':
          return CYCLE_DEFAULT
        case 'collision':
          return COLLISION.ISWALK
        case 'pushable':
          return 0
        case 'breakable':
          return 0
      }
    }

    return value
  }
  function set(name: string, value: WORD) {
    if (ispresent(element)) {
      if (name === 'group') {
        element.group = `group${value as number}`
      } else {
        element[name as keyof BOARD_ELEMENT] = value
      }
    }
  }

  const chip = chipfromelement(board, element)
  const stats = memoryreadcodepagestatdefaults(codepage)
  const targets = objectKeys(stats)
  const stattypes = new Set<string>([
    'select',
    'charedit',
    'coloredit',
    'bgedit',
  ])
  for (let i = 0; i < targets.length; ++i) {
    const target = targets[i]
    switch (target) {
      case 'char':
      case 'cycle':
      case 'color':
      case 'bg':
      case 'group':
      case 'collision':
      case 'pushable':
      case 'breakable':
        break
      default:
        if (isarray(stats[target])) {
          const [typ] = stats[target]
          if (isstring(typ)) {
            const lowered = NAME(typ)
            if (lowered && lowered !== 'hk' && lowered !== 'hotkey') {
              stattypes.add(lowered)
            }
          }
        }
        break
    }
  }
  for (const typ of stattypes) {
    registerhyperlinksharedbridge(chip, typ, get, set)
  }

  const lines: string[] = []
  if (isobject) {
    lines.push(
      `object: ${element.name ?? element.kind ?? 'ERR'} ${p1.x}, ${p1.y}`,
    )
  } else {
    lines.push(`terrain: ${element.kind ?? 'ERR'} ${p1.x}, ${p1.y}`)
  }
  if (isobject) {
    lines.push(`cycle: ${memoryreadelementstat(element, 'cycle')}`)
  }

  const collision = memoryreadelementstat(element, 'collision')
  switch (collision as COLLISION) {
    case COLLISION.ISWALK:
      lines.push(`collision: iswalk`)
      break
    case COLLISION.ISSWIM:
      lines.push(`collision: isswim`)
      break
    case COLLISION.ISSOLID:
      lines.push(`collision: issolid`)
      break
    case COLLISION.ISBULLET:
      lines.push(`collision: isbullet`)
      break
    case COLLISION.ISGHOST:
      lines.push(`collision: isghost`)
      break
  }

  if (isobject) {
    lines.push(
      `ispushable: ${memoryreadelementstat(element, 'pushable') ? `yes` : `no`}`,
    )
  }
  lines.push(
    `isbreakable: ${
      memoryreadelementstat(element, 'breakable') ? `yes` : `no`
    }`,
  )

  lines.push(DIVIDER)

  for (let i = 0; i < targets.length; ++i) {
    const target = targets[i]
    switch (target) {
      case 'char':
      case 'cycle':
      case 'color':
      case 'bg':
      case 'group':
      case 'collision':
      case 'pushable':
      case 'breakable':
        break
      default:
        if (isarray(stats[target])) {
          const [type, label, ...args] = stats[target]
          if (isstring(label)) {
            const linklabel = label || target
            const words: WORD[] = [target, type, ...args]
            lines.push(
              `!${memoryinspectjoinlinkwords(words)};${scrolllinkescapefrag(linklabel)}`,
            )
          }
        }
        break
    }
  }

  lines.push(
    `!${memoryinspectjoinlinkwords(['copycoords', 'hk', '5', ' 5 '])};copy coords`,
  )
  lines.push(DIVIDER)
  lines.push(
    `!${memoryinspectjoinlinkwords(['char', 'hk', 'a', ' A ', 'next'])};${scrolllinkescapefrag(`char: ${element.char ?? element.kinddata?.char ?? 1}`)}`,
  )
  lines.push(
    `!${memoryinspectjoinlinkwords(['color', 'hk', 'c', ' C ', 'next'])};${scrolllinkescapefrag(`color: ${element.color ?? element.kinddata?.color ?? 15}`)}`,
  )
  lines.push(
    `!${memoryinspectjoinlinkwords(['bg', 'hk', 'b', ' B ', 'next'])};${scrolllinkescapefrag(`bg: ${element.bg ?? element.kinddata?.bg ?? 0}`)}`,
  )
  lines.push(`!${memoryinspectjoinlinkwords(['empty', 'hk', '0'])};make empty`)
  lines.push(DIVIDER)

  const grouptokens = [
    'group',
    'select',
    'none',
    '0',
    ...range(1, 127)
      .map((i) => [`group${i}`, `${i}`])
      .flat(),
  ]
  lines.push(`!${grouptokens.join(' ')};group`)
  lines.push(...memoryinspectloaderlines(p1, p1))
  if (ispresent(codepage)) {
    const name = memoryreadcodepagename(codepage)
    const type = memoryreadcodepagetypeasstring(codepage)
    const prefix = memorycodepagetoprefix(codepage)
    lines.push(
      `!@batch pageopen:${codepage.id};edit $blue[${type}] ${prefix}$white${name}${codepagepicksuffix(codepage)}`,
    )
  }
  lines.push(...memoryinspectboardlines(board.id))

  scrollwritelines(player, 'inspect', lines.join('\n'), chip)
}

export function memoryinspectempty(
  player: string,
  p1: PT,
  p2: PT,
  mode: string,
) {
  const mainbook = memoryensuresoftwarebook(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }

  const board = memoryreadplayerboard(player)
  if (!ispresent(board)) {
    return
  }

  switch (mode) {
    case 'emptyall': {
      for (let y = p1.y; y <= p2.y; ++y) {
        for (let x = p1.x; x <= p2.x; ++x) {
          const maybeobject = memoryreadelement(board, { x, y })
          if (maybeobject?.category === CATEGORY.ISOBJECT) {
            memorysafedeleteelement(board, maybeobject, mainbook.timestamp)
          }
          memorywriteterrain(board, { x, y })
        }
      }
      break
    }
    case 'emptyobjects': {
      for (let y = p1.y; y <= p2.y; ++y) {
        for (let x = p1.x; x <= p2.x; ++x) {
          const maybeobject = memoryreadelement(board, { x, y }, true)
          if (maybeobject?.category === CATEGORY.ISOBJECT) {
            memorysafedeleteelement(board, maybeobject, mainbook.timestamp)
          }
        }
      }
      break
    }
    case 'emptyterrain': {
      for (let y = p1.y; y <= p2.y; ++y) {
        for (let x = p1.x; x <= p2.x; ++x) {
          memorywriteterrain(board, { x, y })
        }
      }
      break
    }
  }
}

export function memoryinspectemptymenu(player: string, p1: PT, p2: PT) {
  const mainbook = memoryensuresoftwarebook(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }

  const board = memoryreadplayerboard(player)
  if (!ispresent(board)) {
    return
  }

  const area = ptstoarea(p1, p2)
  const lines = [
    `selected: ${p1.x},${p1.y} - ${p2.x},${p2.y}`,
    DIVIDER,
    `!@batch emptyall:${area} hk 1 " 1 ";clear terrain & objects`,
    `!@batch emptyobjects:${area} hk 2 " 2 ";clear objects`,
    `!@batch emptyterrain:${area} hk 3 " 3 ";clear terrain`,
  ]
  scrollwritelines(player, 'empty', lines.join('\n'), 'batch')
}
