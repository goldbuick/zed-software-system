import { get as idbget, update as idbupdate } from 'idb-keyval'
import { objectKeys } from 'ts-extras'
import { parsetarget } from 'zss/device'
import {
  apitoast,
  gadgetserverclearscroll,
  registercopy,
  registereditoropen,
  vmcli,
  vmcodeaddress,
} from 'zss/device/api'
import { modemwriteinitstring } from 'zss/device/modem'
import { SOFTWARE } from 'zss/device/session'
import { boardremix } from 'zss/feature/boardremix'
import { DIVIDER, write } from 'zss/feature/writeui'
import {
  gadgetcheckqueue,
  gadgethyperlink,
  gadgetstate,
  gadgettext,
} from 'zss/gadget/data/api'
import { ptstoarea, pttoindex, ptwithin, rectpoints } from 'zss/mapping/2d'
import { range } from 'zss/mapping/array'
import { doasync } from 'zss/mapping/func'
import { CYCLE_DEFAULT, waitfor } from 'zss/mapping/tick'
import {
  MAYBE,
  deepcopy,
  isarray,
  isnumber,
  ispresent,
  isstring,
} from 'zss/mapping/types'
import { statformat, stattypestring } from 'zss/words/stats'
import {
  CATEGORY,
  COLLISION,
  COLOR,
  PT,
  STAT_TYPE,
  WORD,
} from 'zss/words/types'

import {
  boardelementindex,
  boardelementisobject,
  boardelementread,
  boardelementreadbyidorindex,
  boardgetterrain,
  boardobjectcreate,
  boardsafedelete,
  boardsetterrain,
} from './boardoperations'
import {
  bookboardelementreadcodepage,
  bookelementdisplayread,
  bookreadcodepagebyaddress,
  bookreadcodepagesbystat,
} from './bookoperations'
import {
  codepagereadname,
  codepagereadstatdefaults,
  codepagereadtype,
  codepagereadtypetostring,
} from './codepageoperations'
import { memoryloadermatches } from './loader'
import { memoryelementtodisplayprefix } from './rendering'
import { BOARD, BOARD_ELEMENT, CODE_PAGE, CODE_PAGE_TYPE } from './types'

import {
  MEMORY_LABEL,
  memoryboardinit,
  memoryboardread,
  memoryelementstatread,
  memoryensuresoftwarebook,
  memoryensuresoftwarecodepage,
  memorypickcodepagewithtype,
  memoryreadbookbysoftware,
  memoryreadbooklist,
  memoryreadoperator,
  memoryreadplayerboard,
} from '.'

// From inspect.ts

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
          const maybeobject = boardelementread(board, { x, y })
          if (maybeobject?.category === CATEGORY.ISOBJECT) {
            boardsafedelete(board, maybeobject, mainbook.timestamp)
          }
          boardsetterrain(board, { x, y })
        }
      }
      break
    }
    case 'emptyobjects': {
      for (let y = p1.y; y <= p2.y; ++y) {
        for (let x = p1.x; x <= p2.x; ++x) {
          const maybeobject = boardelementread(board, { x, y })
          if (maybeobject?.category === CATEGORY.ISOBJECT) {
            boardsafedelete(board, maybeobject, mainbook.timestamp)
          }
        }
      }
      break
    }
    case 'emptyterrain': {
      for (let y = p1.y; y <= p2.y; ++y) {
        for (let x = p1.x; x <= p2.x; ++x) {
          boardsetterrain(board, { x, y })
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
  gadgettext(player, `selected: ${p1.x},${p1.y} - ${p2.x},${p2.y}`)
  gadgettext(player, DIVIDER)
  gadgethyperlink(player, 'batch', 'clear terrain & objects', [
    `emptyall:${area}`,
    'hk',
    '1',
  ])
  gadgethyperlink(player, 'batch', 'clear objects', [
    `emptyobjects:${area}`,
    'hk',
    '2',
  ])
  gadgethyperlink(player, 'batch', 'clear terrain', [
    `emptyterrain:${area}`,
    'hk',
    '3',
  ])

  // send to player as a scroll
  const shared = gadgetstate(player)
  shared.scrollname = 'empty'
  shared.scroll = gadgetcheckqueue(player)
}

export async function memoryinspect(player: string, p1: PT, p2: PT) {
  const mainbook = memoryensuresoftwarebook(MEMORY_LABEL.MAIN)
  const showpaste = await hassecretheap()
  if (!ispresent(mainbook)) {
    return
  }

  const board = memoryreadplayerboard(player)
  if (!ispresent(board)) {
    return
  }

  // ensure lookup
  memoryboardinit(board)

  // one element, or many ?
  if (p1.x === p2.x && p1.y === p2.y) {
    const element = boardelementread(board, p1)
    const codepage = bookboardelementreadcodepage(mainbook, element)
    // found element def
    if (ispresent(element) && ispresent(codepage)) {
      memoryinspectelement(
        player,
        board,
        codepage,
        element,
        p1,
        boardelementisobject(element),
      )
    }
    // most likely empty
    if (!element?.kind) {
      gadgettext(player, `empty: ${p1.x}, ${p1.y}`)
      gadgettext(player, DIVIDER)
      gadgethyperlink(player, 'empty', 'copy coords', [
        `copycoords:${p1.x},${p1.y}`,
        'hk',
        '5',
        ` 5 `,
      ])

      // add gadget scripts
      gadgetinspectloaders(player, p1, p2)

      // board info
      gadgetinspectboard(player, board.id)
    }
  } else {
    memoryinspectarea(player, p1, p2, showpaste)
  }

  // send to player as a scroll
  const shared = gadgetstate(player)
  shared.scrollname = 'inspect'
  shared.scroll = gadgetcheckqueue(player)
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
  const element = boardelementreadbyidorindex(board, inspect.target)
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
      boardsafedelete(board, element, mainbook.timestamp)
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

function chipfromelement(board: MAYBE<BOARD>, element: MAYBE<BOARD_ELEMENT>) {
  const id = element?.id ?? boardelementindex(board, element)
  return `inspect:${id}`
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

  function get(name: string): WORD {
    const value =
      element?.[name as keyof BOARD_ELEMENT] ??
      element?.kinddata?.[name as keyof BOARD_ELEMENT] ??
      0
    return value
  }
  function set(name: string, value: WORD) {
    if (ispresent(element)) {
      element[name as keyof BOARD_ELEMENT] = value
    }
  }

  const strcategory =
    element.category === CATEGORY.ISTERRAIN ? 'terrain' : 'object'
  const strname = element.name ?? element.kind ?? 'ERR'
  const strpos = `${element.x ?? -1}, ${element.y ?? -1}`
  const chip = chipfromelement(board, element)

  gadgettext(player, `${strcategory}: ${strname} ${strpos}`)
  gadgettext(player, DIVIDER)
  gadgethyperlink(player, chip, 'color', [name, `${name}edit`], get, set)

  // send to player as a scroll
  const shared = gadgetstate(player)
  shared.scrollname = name
  shared.scroll = gadgetcheckqueue(player)
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

  function get(name: string): WORD {
    const value =
      element?.[name as keyof BOARD_ELEMENT] ??
      element?.kinddata?.[name as keyof BOARD_ELEMENT] ??
      0
    return value
  }
  function set(name: string, value: WORD) {
    if (ispresent(element)) {
      element[name as keyof BOARD_ELEMENT] = value
    }
  }

  const strcategory =
    element.category === CATEGORY.ISTERRAIN ? 'terrain' : 'object'
  const strname = element.name ?? element.kind ?? 'ERR'
  const strpos = `${element.x ?? -1}, ${element.y ?? -1}`
  const chip = chipfromelement(board, element)

  gadgettext(player, `${strcategory}: ${strname} ${strpos}`)
  gadgettext(player, DIVIDER)
  gadgethyperlink(player, chip, 'char', [name, 'charedit'], get, set)

  // send to player as a scroll
  const shared = gadgetstate(player)
  shared.scrollname = 'char'
  shared.scroll = gadgetcheckqueue(player)
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

  // element stat accessors
  function get(name: string): WORD {
    const value =
      element?.[name as keyof BOARD_ELEMENT] ??
      element?.kinddata?.[name as keyof BOARD_ELEMENT]

    if (name === 'group') {
      return parseFloat(element.group?.replace('group', '') ?? '0')
    }

    // ensure proper defaults
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

  if (isobject) {
    gadgettext(
      player,
      `object: ${element.name ?? element.kind ?? 'ERR'} ${p1.x}, ${p1.y}`,
    )
  } else {
    gadgettext(player, `terrain: ${element.kind ?? 'ERR'} ${p1.x}, ${p1.y}`)
  }

  const chip = chipfromelement(board, element)
  if (isobject) {
    gadgettext(player, `cycle: ${memoryelementstatread(element, 'cycle')}`)
  }

  const collision = memoryelementstatread(element, 'collision')
  switch (collision as COLLISION) {
    case COLLISION.ISWALK:
      gadgettext(player, `collision: iswalk`)
      break
    case COLLISION.ISSWIM:
      gadgettext(player, `collision: isswim`)
      break
    case COLLISION.ISSOLID:
      gadgettext(player, `collision: issolid`)
      break
    case COLLISION.ISBULLET:
      gadgettext(player, `collision: isbullet`)
      break
    case COLLISION.ISGHOST:
      gadgettext(player, `collision: isghost`)
      break
  }

  if (isobject) {
    gadgettext(
      player,
      `ispushable: ${memoryelementstatread(element, 'pushable') ? `yes` : `no`}`,
    )
  }
  gadgettext(
    player,
    `isbreakable: ${
      memoryelementstatread(element, 'breakable') ? `yes` : `no`
    }`,
  )

  gadgettext(player, DIVIDER)

  const stats = codepagereadstatdefaults(codepage)
  const targets = objectKeys(stats)
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
        // skip in favor of built-in hyperlinks
        break
      default:
        if (isarray(stats[target])) {
          const [type, label, ...args] = stats[target]
          if (isstring(label)) {
            gadgethyperlink(
              player,
              chip,
              label || target,
              [target, type, ...args],
              get,
              set,
            )
          }
        }
        break
    }
  }

  gadgethyperlink(player, chip, 'copy coords', [`copycoords`, 'hk', '5', ` 5 `])

  gadgettext(player, DIVIDER)
  gadgethyperlink(
    player,
    chip,
    `char: ${element.char ?? element.kinddata?.char ?? 1}`,
    ['char', 'hk', 'a', ' A ', 'next'],
    get,
    set,
  )
  gadgethyperlink(
    player,
    chip,
    `color: ${element.color ?? element.kinddata?.color ?? 15}`,
    ['color', 'hk', 'c', ' C ', 'next'],
    get,
    set,
  )
  gadgethyperlink(
    player,
    chip,
    `bg: ${element.bg ?? element.kinddata?.bg ?? 0}`,
    ['bg', 'hk', 'b', ' B ', 'next'],
    get,
    set,
  )
  gadgethyperlink(
    player,
    chip,
    'group',
    [
      'group',
      'select',
      'none',
      '0',
      ...range(1, 127)
        .map((i) => [`group${i}`, `${i}`])
        .flat(),
    ],
    get,
    set,
  )

  gadgettext(player, DIVIDER)
  gadgethyperlink(player, chip, `make empty`, ['empty', 'hk', '0'], get, set)

  // add gadget scripts
  gadgettext(player, DIVIDER)
  gadgetinspectloaders(player, p1, p1)

  // codepage links
  gadgettext(player, `codepages:`)
  gadgethyperlink(player, 'batch', `edit @${codepagereadname(codepage)}`, [
    `pageopen:${codepage.id}`,
  ])

  // board info
  gadgetinspectboard(player, board.id)
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
  function get() {
    return all
  }
  function set(name: string, value: WORD) {
    if (isnumber(value)) {
      all = value
      rectpoints(p1.x, p1.y, p2.x, p2.y).forEach((pt) => {
        const el = boardelementread(board, pt)
        if (ispresent(el)) {
          el[name as keyof BOARD_ELEMENT] = value
        }
      })
    }
  }

  gadgettext(player, `batch chars: ${p1.x},${p1.y} - ${p2.x},${p2.y}`)
  gadgettext(player, DIVIDER)
  gadgethyperlink(
    player,
    `batch:${ptstoarea(p1, p2)}`,
    'char',
    [name, 'charedit'],
    get,
    set,
  )

  // send to player as a scroll
  const shared = gadgetstate(player)
  shared.scrollname = 'bulk set char'
  shared.scroll = gadgetcheckqueue(player)
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
  function get() {
    return all
  }
  function set(name: string, value: WORD) {
    if (isnumber(value)) {
      all = value
      for (let y = p1.y; y <= p2.y; ++y) {
        for (let x = p1.x; x <= p2.x; ++x) {
          const el = boardelementread(board, { x, y })
          if (ispresent(el)) {
            el[name as keyof BOARD_ELEMENT] = value
          }
        }
      }
    }
  }

  gadgettext(player, `batch chars: ${p1.x},${p1.y} - ${p2.x},${p2.y}`)
  gadgettext(player, DIVIDER)
  gadgethyperlink(
    player,
    `batch:${ptstoarea(p1, p2)}`,
    'color',
    [name, 'coloredit'],
    get,
    set,
  )

  // send to player as a scroll
  const shared = gadgetstate(player)
  shared.scrollname = 'bulk set color'
  shared.scroll = gadgetcheckqueue(player)
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
  function get() {
    return all
  }
  function set(name: string, value: WORD) {
    if (isnumber(value)) {
      all = value
      rectpoints(p1.x, p1.y, p2.x, p2.y).forEach((pt) => {
        const el = boardelementread(board, pt)
        if (ispresent(el)) {
          el[name as keyof BOARD_ELEMENT] = value
        }
      })
    }
  }

  gadgettext(player, `batch chars: ${p1.x},${p1.y} - ${p2.x},${p2.y}`)
  gadgettext(player, DIVIDER)
  gadgethyperlink(
    player,
    `batch:${ptstoarea(p1, p2)}`,
    'bg',
    [name, 'bgedit'],
    get,
    set,
  )

  // send to player as a scroll
  const shared = gadgetstate(player)
  shared.scrollname = 'bulk set bg'
  shared.scroll = gadgetcheckqueue(player)
}

export function memoryinspectarea(
  player: string,
  p1: PT,
  p2: PT,
  hassecretheap: boolean,
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
  function get(name: string): WORD {
    if (name === 'group') {
      return group
    }
    return 0
  }
  function set(name: string, value: WORD) {
    if (name === 'group') {
      if (isnumber(value)) {
        group = value
        rectpoints(p1.x, p1.y, p2.x, p2.y).forEach((pt) => {
          const el = boardelementread(board, pt)
          if (ispresent(el)) {
            el[name as keyof BOARD_ELEMENT] = `group${value}`
          }
        })
      }
    }
  }

  const area = ptstoarea(p1, p2)
  gadgettext(player, `selected: ${p1.x},${p1.y} - ${p2.x},${p2.y}`)
  gadgettext(player, DIVIDER)
  gadgethyperlink(player, 'batch', 'copy elements', [
    `copy:${area}`,
    'hk',
    '1',
    ` 1 `,
    'next',
  ])
  gadgethyperlink(player, 'batch', 'cut elements', [
    `cut:${area}`,
    'hk',
    '2',
    ` 2 `,
    'next',
  ])
  if (hassecretheap) {
    gadgethyperlink(player, 'batch', 'paste elements', [
      `paste:${area}`,
      'hk',
      '3',
      ` 3 `,
      'next',
    ])
  }
  gadgethyperlink(player, 'batch', 'copy coords', [
    `copycoords:${area}`,
    'hk',
    '5',
    ` 5 `,
  ])
  if (hassecretheap) {
    gadgethyperlink(player, 'batch', 'style transfer', [
      `style:${area}`,
      'hk',
      's',
      ` S `,
      'next',
    ])
  }
  gadgethyperlink(player, 'remix', 'remix coords', [
    `remix:${area}`,
    'hk',
    'r',
    ` R `,
    'next',
  ])

  gadgettext(player, DIVIDER)
  gadgethyperlink(player, 'batch', `set chars:`, [
    `chars:${area}`,
    'hk',
    'a',
    ' A ',
    'next',
  ])
  gadgethyperlink(player, 'batch', `set colors:`, [
    `colors:${area}`,
    'hk',
    'c',
    ' C ',
    'next',
  ])
  gadgethyperlink(player, 'batch', `set bgs:`, [
    `bgs:${area}`,
    'hk',
    'b',
    ' B ',
    'next',
  ])
  gadgethyperlink(
    player,
    `groups:${area}`,
    'group',
    [
      'group',
      'select',
      'none',
      '0',
      ...range(1, 127)
        .map((i) => [`group${i}`, `${i}`])
        .flat(),
    ],
    get,
    set,
  )

  gadgettext(player, DIVIDER)
  gadgethyperlink(player, 'batch', 'make empty', [
    `empty:${area}`,
    'hk',
    '0',
    ` 0 `,
    'next',
  ])

  // add gadget scripts
  gadgettext(player, DIVIDER)
  gadgetinspectloaders(player, p1, p2)

  // codepage links
  gadgettext(player, `codepages:`)

  // scan board for codepages
  const x1 = Math.min(p1.x, p2.x)
  const y1 = Math.min(p1.y, p2.y)
  const x2 = Math.max(p1.x, p2.x)
  const y2 = Math.max(p1.y, p2.y)
  const ids = new Set<string>()
  for (let y = y1; y <= y2; ++y) {
    for (let x = x1; x <= x2; ++x) {
      const element = boardelementread(board, { x, y })
      const codepage = bookboardelementreadcodepage(mainbook, element)
      if (ispresent(codepage) && !ids.has(codepage.id)) {
        ids.add(codepage.id)
        gadgethyperlink(
          player,
          'batch',
          `edit @${codepagereadname(codepage)}`,
          [`pageopen:${codepage.id}`],
        )
      }
    }
  }

  // board info
  gadgetinspectboard(player, board.id)
}

// From inspectbatch.ts

export async function memoryinspectbatchcommand(path: string, player: string) {
  const board = memoryreadplayerboard(player)
  if (!ispresent(board)) {
    return
  }
  const batch = parsetarget(path)
  const [x1, y1, x2, y2] = batch.path.split(',').map((v) => parseFloat(v))
  const p1: PT = { x: Math.min(x1, x2), y: Math.min(y1, y2) }
  const p2: PT = { x: Math.max(x1, x2), y: Math.max(y1, y2) }
  switch (batch.target) {
    case 'copy':
      memoryinspectcopymenu(player, p1, p2)
      break
    case 'copyall':
    case 'copyobjects':
    case 'copyterrain':
      await memoryinspectcopy(player, p1, p2, batch.target)
      break
    case 'copyastext': {
      const p1x = Math.min(p1.x, p2.x)
      const p1y = Math.min(p1.y, p2.y)
      const p2x = Math.max(p1.x, p2.x)
      const p2y = Math.max(p1.y, p2.y)
      let content = ''
      for (let y = p1y; y <= p2y; ++y) {
        let color = COLOR.ONCLEAR
        let bg = COLOR.ONCLEAR
        content += ''
        for (let x = p1x; x <= p2x; ++x) {
          const element = boardgetterrain(board, x, y)
          const display = bookelementdisplayread(element)
          if (display.color != color) {
            color = display.color
            content += `$${COLOR[display.color]}`.toLowerCase()
          }
          if (display.bg != bg) {
            bg = display.bg
            content += `$ON${COLOR[display.bg]}`.toLowerCase()
          }
          content += `$${display.char}`
        }
        content += '\n'
      }
      registercopy(SOFTWARE, player, content)
      apitoast(SOFTWARE, player, `copied! chars ${p1x},${p1y} to ${p2x},${p2y}`)
      break
    }
    case 'cut':
      memoryinspectcutmenu(player, p1, p2)
      break
    case 'cutall':
    case 'cutobjects':
    case 'cutterrain':
      await memoryinspectcut(player, p1, p2, batch.target)
      break
    case 'paste':
      memoryinspectpastemenu(player, p1, p2)
      break
    case 'pasteall':
    case 'pasteobjects':
    case 'pasteterrain':
    case 'pasteterraintiled':
      await memoryinspectpaste(player, p1, p2, batch.target)
      break
    case 'style':
      await memoryinspectstylemenu(player, p1, p2)
      break
    case 'styleall':
    case 'styleobjects':
    case 'styleterrain':
      await memoryinspectstyle(player, p1, p2, batch.target)
      break
    case 'empty':
      memoryinspectemptymenu(player, p1, p2)
      break
    case 'emptyall':
    case 'emptyobjects':
    case 'emptyterrain':
      memoryinspectempty(player, p1, p2, batch.target)
      break
    case 'chars':
      memoryinspectchararea(player, p1, p2, 'char')
      break
    case 'colors':
      memoryinspectcolorarea(player, p1, p2, 'color')
      break
    case 'bgs':
      memoryinspectbgarea(player, p1, p2, 'bg')
      break
    case 'copycoords':
      registercopy(SOFTWARE, player, [x1, y1, x2, y2].join(' '))
      break
    case 'pageopen':
      doasync(SOFTWARE, player, async () => {
        // wait a little
        await waitfor(800)
        // open codepage
        vmcli(SOFTWARE, player, `#pageopen ${batch.path}`)
      })
      break
    default:
      console.info('unknown batch', batch)
      break
  }
}

// COPY & PASTE buffers

type BOARD_ELEMENT_BUFFER = {
  board: string
  width: number
  height: number
  terrain: MAYBE<BOARD_ELEMENT>[]
  objects: BOARD_ELEMENT[]
}

// read / write from indexdb

export async function readsecretheap(): Promise<
  BOARD_ELEMENT_BUFFER | undefined
> {
  return idbget('secretheap')
}

async function writesecretheap(
  updater: (oldValue: BOARD_ELEMENT_BUFFER | undefined) => BOARD_ELEMENT_BUFFER,
): Promise<void> {
  return idbupdate('secretheap', updater)
}

export async function hassecretheap() {
  return !!(await readsecretheap())
}

function createboardelementbuffer(
  board: BOARD,
  p1: PT,
  p2: PT,
): BOARD_ELEMENT_BUFFER {
  const x1 = Math.min(p1.x, p2.x)
  const y1 = Math.min(p1.y, p2.y)
  const x2 = Math.max(p1.x, p2.x)
  const y2 = Math.max(p1.y, p2.y)
  const width = x2 - x1 + 1
  const height = y2 - y1 + 1
  const terrain: MAYBE<BOARD_ELEMENT>[] = []
  const objects: BOARD_ELEMENT[] = []

  // corner coords on copy
  for (let y = y1; y <= y2; ++y) {
    for (let x = x1; x <= x2; ++x) {
      const pt = { x: x - x1, y: y - y1 }
      const maybeobject = boardelementread(board, { x, y })
      if (maybeobject?.category === CATEGORY.ISOBJECT) {
        terrain.push(deepcopy(boardgetterrain(board, x, y)))
        if (bookelementdisplayread(maybeobject).name !== 'player') {
          objects.push({
            ...deepcopy(maybeobject),
            ...pt,
            id: 'blank',
          })
        }
      } else {
        // maybe terrain
        terrain.push({
          ...deepcopy(maybeobject),
          ...pt,
        })
      }
    }
  }

  return {
    board: board.id,
    width,
    height,
    terrain,
    objects,
  }
}

export async function memoryinspectcopy(
  player: string,
  p1: PT,
  p2: PT,
  mode: string,
) {
  const board = memoryreadplayerboard(player)
  if (!ispresent(board)) {
    return
  }

  const secretheap = createboardelementbuffer(board, p1, p2)
  switch (mode) {
    case 'copyobjects':
      secretheap.terrain = []
      break
    case 'copyterrain':
      secretheap.objects = []
      break
  }

  await writesecretheap(() => secretheap)
}

export function memoryinspectcopymenu(player: string, p1: PT, p2: PT) {
  const area = ptstoarea(p1, p2)
  gadgettext(player, `selected: ${p1.x},${p1.y} - ${p2.x},${p2.y}`)
  gadgettext(player, DIVIDER)

  gadgethyperlink(player, 'batch', 'copy terrain & objects', [
    `copyall:${area}`,
    'hk',
    '1',
  ])
  gadgethyperlink(player, 'batch', 'copy objects', [
    `copyobjects:${area}`,
    'hk',
    '2',
  ])
  gadgethyperlink(player, 'batch', 'copy terrain', [
    `copyterrain:${area}`,
    'hk',
    '3',
  ])
  gadgethyperlink(player, 'batch', 'copy as text', [
    `copyastext:${area}`,
    'hk',
    '4',
  ])

  // send to player as a scroll
  const shared = gadgetstate(player)
  shared.scrollname = 'copy'
  shared.scroll = gadgetcheckqueue(player)
}

export async function memoryinspectcut(
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

  const secretheap = createboardelementbuffer(board, p1, p2)
  switch (mode) {
    case 'cutobjects':
      secretheap.terrain = []
      break
    case 'cutterrain':
      secretheap.objects = []
      break
  }

  switch (mode) {
    case 'cutall': {
      for (let y = p1.y; y <= p2.y; ++y) {
        for (let x = p1.x; x <= p2.x; ++x) {
          const maybeobject = boardelementread(board, { x, y })
          if (maybeobject?.category === CATEGORY.ISOBJECT) {
            boardsafedelete(board, maybeobject, mainbook.timestamp)
          }
          boardsetterrain(board, { x, y })
        }
      }
      break
    }
    case 'cutobjects': {
      for (let y = p1.y; y <= p2.y; ++y) {
        for (let x = p1.x; x <= p2.x; ++x) {
          const maybeobject = boardelementread(board, { x, y })
          if (maybeobject?.category === CATEGORY.ISOBJECT) {
            boardsafedelete(board, maybeobject, mainbook.timestamp)
          }
        }
      }
      break
    }
    case 'cutterrain': {
      for (let y = p1.y; y <= p2.y; ++y) {
        for (let x = p1.x; x <= p2.x; ++x) {
          boardsetterrain(board, { x, y })
        }
      }
      break
    }
  }

  await writesecretheap(() => secretheap)
}

export function memoryinspectcutmenu(player: string, p1: PT, p2: PT) {
  const area = ptstoarea(p1, p2)
  gadgettext(player, `selected: ${p1.x},${p1.y} - ${p2.x},${p2.y}`)
  gadgettext(player, DIVIDER)

  gadgethyperlink(player, 'batch', 'cut terrain & objects', [
    `cutall:${area}`,
    'hk',
    '1',
  ])
  gadgethyperlink(player, 'batch', 'cut objects', [
    `cutobjects:${area}`,
    'hk',
    '2',
  ])
  gadgethyperlink(player, 'batch', 'cut terrain', [
    `cutterrain:${area}`,
    'hk',
    '3',
  ])

  // send to player as a scroll
  const shared = gadgetstate(player)
  shared.scrollname = 'cut'
  shared.scroll = gadgetcheckqueue(player)
}

export async function memoryinspectpaste(
  player: string,
  p1: PT,
  p2: PT,
  mode: string,
) {
  const board = memoryreadplayerboard(player)
  const secretheap = await readsecretheap()
  if (!ispresent(board) || !ispresent(secretheap)) {
    return
  }

  const x1 = Math.min(p1.x, p2.x)
  const y1 = Math.min(p1.y, p2.y)
  const x2 = Math.max(p1.x, p2.x)
  const y2 = Math.max(p1.y, p2.y)
  const width = x2 - x1 + 1
  const height = y2 - y1 + 1

  const iwidth = Math.min(secretheap.width, width)
  const iheight = Math.min(secretheap.height, height)

  switch (mode) {
    case 'pasteall': {
      for (let y = 0; y < iheight; ++y) {
        for (let x = 0; x < iwidth; ++x) {
          const idx = pttoindex({ x, y }, secretheap.width)
          boardsetterrain(board, {
            ...secretheap.terrain[idx],
            x: x1 + x,
            y: y1 + y,
          })
        }
      }
      for (let i = 0; i < secretheap.objects.length; ++i) {
        const obj = secretheap.objects[i]
        if (
          ispresent(obj.x) &&
          ispresent(obj.y) &&
          ptwithin(obj.x, obj.y, 0, width - 1, height - 1, 0)
        ) {
          boardobjectcreate(board, {
            ...obj,
            id: undefined,
            x: x1 + obj.x,
            y: y1 + obj.y,
          })
        }
      }
      break
    }
    case 'pasteobjects':
      for (let i = 0; i < secretheap.objects.length; ++i) {
        const obj = secretheap.objects[i]
        if (
          ispresent(obj.x) &&
          ispresent(obj.y) &&
          ptwithin(obj.x, obj.y, 0, width - 1, height - 1, 0)
        ) {
          boardobjectcreate(board, {
            ...obj,
            id: undefined,
            x: x1 + obj.x,
            y: y1 + obj.y,
          })
        }
      }
      break
    case 'pasteterrain':
      for (let y = 0; y < iheight; ++y) {
        for (let x = 0; x < iwidth; ++x) {
          const idx = pttoindex({ x, y }, secretheap.width)
          boardsetterrain(board, {
            ...secretheap.terrain[idx],
            x: x1 + x,
            y: y1 + y,
          })
        }
      }
      break
    case 'pasteterraintiled':
      for (let y = y1; y <= y2; ++y) {
        for (let x = x1; x <= x2; ++x) {
          const tx = (x - x1) % secretheap.width
          const ty = (y - y1) % secretheap.height
          const idx = pttoindex({ x: tx, y: ty }, secretheap.width)
          boardsetterrain(board, {
            ...secretheap.terrain[idx],
            x,
            y,
          })
        }
      }
      break
  }
}

export function memoryinspectpastemenu(player: string, p1: PT, p2: PT) {
  const area = ptstoarea(p1, p2)
  gadgettext(player, `selected: ${p1.x},${p1.y} - ${p2.x},${p2.y}`)
  gadgettext(player, DIVIDER)
  gadgethyperlink(player, 'batch', 'paste terrain & objects', [
    `pasteall:${area}`,
    'hk',
    '1',
  ])
  gadgethyperlink(player, 'batch', 'paste objects', [
    `pasteobjects:${area}`,
    'hk',
    '2',
  ])
  gadgethyperlink(player, 'batch', 'paste terrain', [
    `pasteterrain:${area}`,
    'hk',
    '3',
  ])
  gadgethyperlink(player, 'batch', 'paste terrain tiled', [
    `pasteterraintiled:${area}`,
    'hk',
    '4',
  ])

  // send to player as a scroll
  const shared = gadgetstate(player)
  shared.scrollname = 'paste'
  shared.scroll = gadgetcheckqueue(player)
}

// From inspectgadget.ts

export function gadgetinspectloaders(player: string, p1: PT, p2: PT) {
  // add matching loaders
  const loaders = memoryloadermatches('text', 'gadget:action')
  if (loaders.length) {
    gadgettext(player, 'gadget actions:')
  }

  const area = ptstoarea(p1, p2)
  for (let i = 0; i < loaders.length; ++i) {
    const codepage = loaders[i]
    const name = codepagereadname(codepage)
    gadgethyperlink(player, 'gadget', `run ${name}`, [
      'action',
      '',
      codepage.id,
      area,
    ])
  }
}

export function gadgetinspectboard(player: string, board: string) {
  const boardcodepage = memorypickcodepagewithtype(CODE_PAGE_TYPE.BOARD, board)
  gadgettext(player, `board ${codepagereadname(boardcodepage)}:`)
  gadgethyperlink(player, 'batch', `board id ${board}`, ['copyit', board])
  gadgethyperlink(player, 'batch', `edit board codepage`, [`pageopen:${board}`])
}

type REMIX_CONFIG = {
  stat: string
  patternsize: number
  mirror: number
}

// read / write from indexdb

export async function readremixconfig(): Promise<REMIX_CONFIG | undefined> {
  return idbget('remixconfig')
}

export async function writeremixconfig(
  updater: (oldValue: REMIX_CONFIG | undefined) => REMIX_CONFIG,
): Promise<void> {
  return idbupdate('remixconfig', updater)
}

let remixconfig: REMIX_CONFIG = {
  stat: '',
  patternsize: 2,
  mirror: 1,
}

export async function memoryinspectremixcommand(path: string, player: string) {
  const board = memoryreadplayerboard(player)
  if (!ispresent(board)) {
    return
  }
  const remix = parsetarget(path)
  const [x1, y1, x2, y2] = remix.path.split(',').map((v) => parseFloat(v))
  const p1: PT = { x: Math.min(x1, x2), y: Math.min(y1, y2) }
  const p2: PT = { x: Math.max(x1, x2), y: Math.max(y1, y2) }
  switch (remix.target) {
    case 'remix': {
      await memoryinspectremixmenu(player, p1, p2)
      break
    }
    case 'remixrun': {
      const sourceboard = memoryboardread(remixconfig.stat)
      if (ispresent(sourceboard)) {
        boardremix(
          board.id,
          sourceboard.id,
          remixconfig.patternsize,
          remixconfig.mirror,
          p1,
          p2,
          'all',
        )
      }
      await writeremixconfig(() => remixconfig)
      break
    }
    default:
      console.info('unknown remix', remix)
      break
  }
}

export async function memoryinspectremixmenu(player: string, p1: PT, p2: PT) {
  const config = await readremixconfig()
  remixconfig = {
    ...remixconfig,
    ...config,
  }

  const area = ptstoarea(p1, p2)
  gadgettext(player, `selected: ${p1.x},${p1.y} - ${p2.x},${p2.y}`)
  gadgettext(player, DIVIDER)

  function get(name: string) {
    return remixconfig[name as keyof REMIX_CONFIG]
  }
  function set(name: string, value: WORD) {
    if (isnumber(value) || isstring(value)) {
      // @ts-expect-error bah
      remixconfig[name as keyof REMIX_CONFIG] = value
    }
  }

  gadgethyperlink(player, 'remix', 'source board', [`stat`, 'text'], get, set)
  gadgethyperlink(
    player,
    'remix',
    'patternsize',
    [`patternsize`, 'number', '1', '5'],
    get,
    set,
  )
  gadgethyperlink(
    player,
    'remix',
    'mirror',
    [`mirror`, 'number', '1', '8'],
    get,
    set,
  )

  gadgettext(player, DIVIDER)
  gadgethyperlink(player, 'remix', 'run', [
    `remixrun:${area}`,
    'hk',
    'r',
    ` R `,
  ])

  // send to player as a scroll
  const shared = gadgetstate(player)
  shared.scrollname = 'remix'
  shared.scroll = gadgetcheckqueue(player)
}

type STYLE_CONFIG = {
  stylechars: number
  stylecolors: number
  stylebgs: number
}

// read / write from indexdb

export async function readstyleconfig(): Promise<STYLE_CONFIG | undefined> {
  return idbget('styleconfig')
}

export async function writestyleconfig(
  updater: (oldValue: STYLE_CONFIG | undefined) => STYLE_CONFIG,
): Promise<void> {
  return idbupdate('styleconfig', updater)
}

let styleconfig: STYLE_CONFIG = {
  stylechars: 1,
  stylecolors: 1,
  stylebgs: 1,
}

export async function memoryinspectstyle(
  player: string,
  p1: PT,
  p2: PT,
  mode: string,
) {
  await writestyleconfig(() => styleconfig)
  const board = memoryreadplayerboard(player)
  const secretheap = await readsecretheap()
  if (!ispresent(board) || !ispresent(secretheap)) {
    return
  }

  const x1 = Math.min(p1.x, p2.x)
  const y1 = Math.min(p1.y, p2.y)
  const x2 = Math.max(p1.x, p2.x)
  const y2 = Math.max(p1.y, p2.y)
  const width = x2 - x1 + 1
  const height = y2 - y1 + 1
  const iwidth = Math.min(secretheap.width, width)
  const iheight = Math.min(secretheap.height, height)

  for (let y = 0; y < iheight; ++y) {
    for (let x = 0; x < iwidth; ++x) {
      const idx = pttoindex({ x, y }, secretheap.width)
      const terrain = secretheap.terrain[idx]
      const display = bookelementdisplayread(terrain)
      const pt = { x: x1 + x, y: y1 + y }
      if (mode === 'styleall' || mode === 'styleobjects') {
        const element = boardelementread(board, pt)
        if (ispresent(element) && boardelementisobject(element)) {
          if (styleconfig.stylechars) {
            element.char = display.char
          }
          if (styleconfig.stylecolors) {
            element.color = display.color
          }
          if (styleconfig.stylebgs) {
            element.bg = display.bg
          }
        }
      }
      if (mode === 'styleall' || mode === 'styleterrain') {
        const element = boardgetterrain(board, pt.x, pt.y)
        if (ispresent(element)) {
          if (styleconfig.stylechars) {
            element.char = display.char
          }
          if (styleconfig.stylecolors) {
            element.color = display.color
          }
          if (styleconfig.stylebgs) {
            element.bg = display.bg
          }
        }
      }
    }
  }
}

export async function memoryinspectstylemenu(player: string, p1: PT, p2: PT) {
  const config = await readstyleconfig()
  styleconfig = {
    ...styleconfig,
    ...config,
  }

  const area = ptstoarea(p1, p2)

  function get(name: string) {
    return styleconfig[name as keyof STYLE_CONFIG]
  }
  function set(name: string, value: WORD) {
    if (isnumber(value) || isstring(value)) {
      // @ts-expect-error bah
      styleconfig[name as keyof STYLE_CONFIG] = value
    }
  }

  gadgettext(player, `selected: ${p1.x},${p1.y} - ${p2.x},${p2.y}`)
  gadgettext(player, `apply visuals from the terrain`)
  gadgettext(player, `stored in the paste buffer`)
  gadgethyperlink(
    player,
    'batch',
    'style chars?',
    [`stylechars`, 'select', 'no', '0', 'yes', '1'],
    get,
    set,
  )
  gadgethyperlink(
    player,
    'batch',
    'style colors?',
    [`stylecolors`, 'select', 'no', '0', 'yes', '1'],
    get,
    set,
  )
  gadgethyperlink(
    player,
    'batch',
    'style bgs?',
    [`stylebgs`, 'select', 'no', '0', 'yes', '1'],
    get,
    set,
  )
  gadgettext(player, DIVIDER)
  gadgethyperlink(player, 'batch', 'style terrain & objects', [
    `styleall:${area}`,
    'hk',
    '1',
  ])
  gadgethyperlink(player, 'batch', 'style objects', [
    `styleobjects:${area}`,
    'hk',
    '2',
  ])
  gadgethyperlink(player, 'batch', 'style terrain', [
    `styleterrain:${area}`,
    'hk',
    '3',
  ])

  // send to player as a scroll
  const shared = gadgetstate(player)
  shared.scrollname = 'style'
  shared.scroll = gadgetcheckqueue(player)
}

export type FINDANY_CONFIG = {
  expr1: string
  expr2: string
  expr3: string
  expr4: string
}

// read / write from indexdb

export async function readfindanyconfig(): Promise<FINDANY_CONFIG | undefined> {
  return idbget('findanyconfig')
}

export async function writefindanyconfig(
  updater: (oldValue: FINDANY_CONFIG | undefined) => FINDANY_CONFIG,
): Promise<void> {
  return idbupdate('findanyconfig', updater)
}

let findanyconfig: FINDANY_CONFIG = {
  expr1: 'player',
  expr2: '',
  expr3: '',
  expr4: '',
}

export async function memoryfindanymenu(player: string) {
  const config = await readfindanyconfig()
  findanyconfig = {
    ...findanyconfig,
    ...config,
  }

  const board = memoryreadplayerboard(player)
  if (!ispresent(board)) {
    return
  }

  gadgettext(player, `find any element(s)`)
  gadgettext(player, DIVIDER)

  function get(name: string) {
    return findanyconfig[name as keyof FINDANY_CONFIG]
  }
  function set(name: string, value: WORD) {
    if (isnumber(value) || isstring(value)) {
      // @ts-expect-error bah
      findanyconfig[name as keyof FINDANY_CONFIG] = value
    }
  }

  gadgethyperlink(player, 'findany', 'slot 1: any', ['expr1', 'text'], get, set)
  gadgethyperlink(player, 'findany', 'slot 2: any', ['expr2', 'text'], get, set)
  gadgethyperlink(player, 'findany', 'slot 3: any', ['expr3', 'text'], get, set)
  gadgethyperlink(player, 'findany', 'slot 4: any', ['expr4', 'text'], get, set)
  gadgettext(player, DIVIDER)
  gadgethyperlink(player, 'findany', 'clear find(s)', [
    'clear',
    'hk',
    'c',
    ` C `,
  ])
  gadgethyperlink(player, 'findany', 'find 1', ['expr1', 'hk', '1', ` 1 `])
  gadgethyperlink(player, 'findany', 'find 2', ['expr2', 'hk', '2', ` 2 `])
  gadgethyperlink(player, 'findany', 'find 3', ['expr3', 'hk', '3', ` 3 `])
  gadgethyperlink(player, 'findany', 'find 4', ['expr4', 'hk', '4', ` 4 `])

  // send to player as a scroll
  const shared = gadgetstate(player)
  shared.scrollname = 'findany'
  shared.scroll = gadgetcheckqueue(player)
}

export async function memoryfindany(
  path: keyof typeof findanyconfig,
  player: string,
) {
  const board = memoryreadplayerboard(player)
  if (!ispresent(board)) {
    return
  }

  await writefindanyconfig(() => findanyconfig)

  const expr: string = findanyconfig[path] ?? ''
  if (ispresent(expr)) {
    vmcli(SOFTWARE, player, `#findany ${expr ? `any ${expr}` : ''}`)
  } else {
    // clear case
    vmcli(SOFTWARE, player, `#findany`)
  }
}

function findcodepage(nameorid: string): MAYBE<CODE_PAGE> {
  // first check for existing codepage with matching name or id
  const books = memoryreadbooklist()
  for (let i = 0; i < books.length; ++i) {
    const maybecodepage = bookreadcodepagebyaddress(books[i], nameorid)
    if (ispresent(maybecodepage)) {
      return maybecodepage
    }
  }
  return undefined
}

function makecodepagedesc(type: CODE_PAGE_TYPE, player: string) {
  switch (type) {
    case CODE_PAGE_TYPE.OBJECT:
      gadgettext(player, '$greenobject - moving board elements')
      break
    case CODE_PAGE_TYPE.TERRAIN:
      gadgettext(player, '$greenterrain - walkable, walls, or water')
      break
    case CODE_PAGE_TYPE.BOARD:
      gadgettext(player, '$greenboard - 60 x 25 area of terrain & object')
      break
    case CODE_PAGE_TYPE.LOADER:
      gadgettext(player, '$greenloader - run code on @event(s)')
      break
    case CODE_PAGE_TYPE.PALETTE:
      gadgettext(player, '$greenpalette - custom 16 colors')
      break
    case CODE_PAGE_TYPE.CHARSET:
      gadgettext(player, '$greencharset - custom ascii font')
      break
  }
}

function previewcodepage(codepage: CODE_PAGE, player: string) {
  const type = codepagereadtype(codepage)
  makecodepagedesc(type, player)
  gadgethyperlink(
    player,
    'makeit',
    `edit$CYAN @${codepagereadtypetostring(codepage)} ${codepagereadname(codepage)}`,
    ['edit', '', codepage.id],
  )
  // We should show the first 5 lines of the codepage here
  const lines = codepage.code.split('\n').slice(1, 6)
  lines.forEach((line) => gadgettext(player, `$WHITE  ${line}`))
}

function checkforcodepage(name: string, player: string) {
  // first check for existing codepage with matching name or id
  const books = memoryreadbooklist()

  let nomatch = true
  for (let i = 0; i < books.length; ++i) {
    // scan for id / name / stat matches
    const codepages = bookreadcodepagesbystat(books[i], name)
    for (let c = 0; c < codepages.length; ++c) {
      nomatch = false
      previewcodepage(codepages[c], player)
    }
  }

  return nomatch
}

export function memorymakeitscroll(makeit: string, player: string) {
  const [maybestat, maybelabel] = makeit.split(';')
  const words = maybestat.split(' ')
  const statname = statformat(maybelabel, words, true)
  const statvalue = statformat(maybelabel, words, false)

  function createmakecodepage(type: STAT_TYPE, name: string) {
    const typename = stattypestring(type)
    switch (type) {
      case STAT_TYPE.OBJECT:
        makecodepagedesc(CODE_PAGE_TYPE.OBJECT, player)
        break
      case STAT_TYPE.TERRAIN:
        makecodepagedesc(CODE_PAGE_TYPE.TERRAIN, player)
        break
      case STAT_TYPE.BOARD:
        makecodepagedesc(CODE_PAGE_TYPE.BOARD, player)
        break
      case STAT_TYPE.LOADER:
        makecodepagedesc(CODE_PAGE_TYPE.LOADER, player)
        break
      case STAT_TYPE.PALETTE:
        makecodepagedesc(CODE_PAGE_TYPE.PALETTE, player)
        break
      case STAT_TYPE.CHARSET:
        makecodepagedesc(CODE_PAGE_TYPE.CHARSET, player)
        break
    }
    switch (type) {
      case STAT_TYPE.OBJECT:
        gadgethyperlink(player, 'makeit', `create object$CYAN @${name}`, [
          'create',
          'hk',
          'o',
          '',
          '',
          typename,
          name,
        ])
        break
      case STAT_TYPE.TERRAIN:
        gadgethyperlink(player, 'makeit', `create$CYAN @terrain ${name}`, [
          'create',
          'hk',
          't',
          '',
          '',
          typename,
          name,
        ])
        break
      case STAT_TYPE.BOARD:
        gadgethyperlink(player, 'makeit', `create$CYAN @board ${name}`, [
          'create',
          'hk',
          'b',
          '',
          '',
          typename,
          name,
        ])
        break
      case STAT_TYPE.LOADER:
        gadgethyperlink(player, 'makeit', `create$CYAN @loader ${name}`, [
          'create',
          'hk',
          'l',
          '',
          '',
          typename,
          name,
        ])
        break
      case STAT_TYPE.PALETTE:
        gadgethyperlink(player, 'makeit', `create$CYAN @palette ${name}`, [
          'create',
          'hk',
          'p',
          '',
          '',
          typename,
          name,
        ])
        break
      case STAT_TYPE.CHARSET:
        gadgethyperlink(player, 'makeit', `create$CYAN @charset ${name}`, [
          'create',
          'hk',
          'c',
          '',
          '',
          typename,
          name,
        ])
        break
    }
    gadgettext(player, '')
  }

  // first check for existing codepage with matching name or id
  const nomatch = checkforcodepage(maybestat, player)
  if (nomatch) {
    switch (statname.type) {
      case STAT_TYPE.LOADER:
      case STAT_TYPE.BOARD:
      case STAT_TYPE.TERRAIN:
      case STAT_TYPE.CHARSET:
      case STAT_TYPE.PALETTE: {
        const value = statname.values.join(' ')
        createmakecodepage(statname.type, value)
        break
      }
      case STAT_TYPE.OBJECT:
        if (statvalue.values[0].toLowerCase() === 'object') {
          const values = statvalue.values.slice(1)
          const value = values.join(' ')
          createmakecodepage(statname.type, value)
        } else {
          const value = statvalue.values.join(' ')
          switch (statvalue.type) {
            case STAT_TYPE.CONST:
              createmakecodepage(STAT_TYPE.OBJECT, value)
              if (statvalue.values.length === 1) {
                createmakecodepage(STAT_TYPE.TERRAIN, value)
                createmakecodepage(STAT_TYPE.BOARD, value)
                createmakecodepage(STAT_TYPE.LOADER, value)
                createmakecodepage(STAT_TYPE.PALETTE, value)
                createmakecodepage(STAT_TYPE.CHARSET, value)
              }
              gadgettext(player, '$purple  if you typed in @char 12 or similar')
              gadgettext(
                player,
                '$purple  try using #set <stat> <value> instead',
              )
              gadgettext(
                player,
                '$purple  or you can edit the @player codepage',
              )
              gadgettext(player, '$purple  to make changes to player stats')
              break
            case STAT_TYPE.RANGE:
            case STAT_TYPE.SELECT:
            case STAT_TYPE.NUMBER:
            case STAT_TYPE.TEXT:
            case STAT_TYPE.HOTKEY:
            case STAT_TYPE.COPYIT:
            case STAT_TYPE.OPENIT:
            case STAT_TYPE.VIEWIT:
            case STAT_TYPE.ZSSEDIT:
            case STAT_TYPE.CHAREDIT:
            case STAT_TYPE.COLOREDIT:
              break
          }
        }
        break
    }
  }

  // send to player as a scroll
  const shared = gadgetstate(player)
  shared.scrollname = 'makeit'
  shared.scroll = gadgetcheckqueue(player)
}

export function memorymakeitcommand(
  path: string,
  data: string[],
  player: string,
) {
  function openeditor(codepage: MAYBE<CODE_PAGE>, didcreate: boolean) {
    doasync(SOFTWARE, player, async () => {
      if (ispresent(codepage)) {
        const type = codepagereadtypetostring(codepage)
        const name = codepagereadname(codepage)
        if (didcreate) {
          write(
            SOFTWARE,
            player,
            `!pageopen ${codepage.id};$blue[${type}]$white ${name}`,
          )
        }
        // wait a little
        await waitfor(800)
        // open codepage
        vmcli(SOFTWARE, player, `#pageopen ${codepage.id}`)
      }
    })
  }

  switch (path) {
    case 'edit': {
      const [codepageid] = data
      openeditor(findcodepage(codepageid), false)
      break
    }
    case 'create': {
      const [type, name] = data
      // attempt to check first word as codepage type to create
      switch (type) {
        case stattypestring(STAT_TYPE.LOADER): {
          const [codepage, didcreate] = memoryensuresoftwarecodepage(
            MEMORY_LABEL.MAIN,
            name,
            CODE_PAGE_TYPE.LOADER,
          )
          openeditor(codepage, didcreate)
          break
        }
        case stattypestring(STAT_TYPE.BOARD): {
          const [codepage, didcreate] = memoryensuresoftwarecodepage(
            MEMORY_LABEL.MAIN,
            name,
            CODE_PAGE_TYPE.BOARD,
          )
          openeditor(codepage, didcreate)
          break
        }
        case stattypestring(STAT_TYPE.OBJECT): {
          const [codepage, didcreate] = memoryensuresoftwarecodepage(
            MEMORY_LABEL.MAIN,
            name,
            CODE_PAGE_TYPE.OBJECT,
          )
          openeditor(codepage, didcreate)
          break
        }
        case stattypestring(STAT_TYPE.TERRAIN): {
          const [codepage, didcreate] = memoryensuresoftwarecodepage(
            MEMORY_LABEL.MAIN,
            name,
            CODE_PAGE_TYPE.TERRAIN,
          )
          openeditor(codepage, didcreate)
          break
        }
        case stattypestring(STAT_TYPE.CHARSET): {
          const [codepage, didcreate] = memoryensuresoftwarecodepage(
            MEMORY_LABEL.MAIN,
            name,
            CODE_PAGE_TYPE.CHARSET,
          )
          openeditor(codepage, didcreate)
          break
        }
        case stattypestring(STAT_TYPE.PALETTE): {
          const [codepage, didcreate] = memoryensuresoftwarecodepage(
            MEMORY_LABEL.MAIN,
            name,
            CODE_PAGE_TYPE.PALETTE,
          )
          openeditor(codepage, didcreate)
          break
        }
      }
      break
    }
  }
}
