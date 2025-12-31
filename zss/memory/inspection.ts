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
import { DIVIDER } from 'zss/feature/writeui'
import {
  gadgetcheckqueue,
  gadgethyperlink,
  gadgetstate,
  gadgettext,
} from 'zss/gadget/data/api'
import { ptstoarea, rectpoints } from 'zss/mapping/2d'
import { range } from 'zss/mapping/array'
import { doasync } from 'zss/mapping/func'
import { CYCLE_DEFAULT, waitfor } from 'zss/mapping/tick'
import {
  MAYBE,
  isarray,
  isnumber,
  ispresent,
  isstring,
} from 'zss/mapping/types'
import { CATEGORY, COLLISION, PT, WORD } from 'zss/words/types'

import { memoryboardelementisobject } from './boardelement'
import {
  memoryboardelementindex,
  memoryboardelementread,
  memoryboardelementreadbyidorindex,
  memoryboardsafedelete,
  memoryboardsetterrain,
} from './boardoperations'
import { memorybookboardelementreadcodepage } from './bookoperations'
import {
  memorycodepagereadname,
  memorycodepagereadstatdefaults,
} from './codepageoperations'
import { memoryhassecretheap } from './inspectionbatch'
import { memoryloadermatches } from './loader'
import { memoryelementtodisplayprefix } from './rendering'
import {
  BOARD,
  BOARD_ELEMENT,
  CODE_PAGE,
  CODE_PAGE_TYPE,
  MEMORY_LABEL,
} from './types'

import {
  memoryboardinit,
  memoryelementstatread,
  memoryensuresoftwarebook,
  memorypickcodepagewithtype,
  memoryreadbookbysoftware,
  memoryreadoperator,
  memoryreadplayerboard,
} from '.'

// From inspect.ts

export function memorygadgetinspectboard(player: string, board: string) {
  const boardcodepage = memorypickcodepagewithtype(CODE_PAGE_TYPE.BOARD, board)
  gadgettext(player, `board ${memorycodepagereadname(boardcodepage)}:`)
  gadgethyperlink(player, 'batch', `board id ${board}`, ['copyit', board])
  gadgethyperlink(player, 'batch', `edit board codepage`, [`pageopen:${board}`])
}

export function memorygadgetinspectloaders(player: string, p1: PT, p2: PT) {
  // add matching loaders
  const loaders = memoryloadermatches('text', 'gadget:action')
  if (loaders.length) {
    gadgettext(player, 'gadget actions:')
  }

  const area = ptstoarea(p1, p2)
  for (let i = 0; i < loaders.length; ++i) {
    const codepage = loaders[i]
    const name = memorycodepagereadname(codepage)
    gadgethyperlink(player, 'gadget', `run ${name}`, [
      'action',
      '',
      codepage.id,
      area,
    ])
  }
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
  memoryboardinit(board)

  // one element, or many ?
  if (p1.x === p2.x && p1.y === p2.y) {
    const element = memoryboardelementread(board, p1)
    const codepage = memorybookboardelementreadcodepage(mainbook, element)
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
      memorygadgetinspectloaders(player, p1, p2)

      // board info
      memorygadgetinspectboard(player, board.id)
    }
  } else {
    memoryinspectarea(player, p1, p2, showpaste)
  }

  // send to player as a scroll
  const shared = gadgetstate(player)
  shared.scrollname = 'inspect'
  shared.scroll = gadgetcheckqueue(player)
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
          const el = memoryboardelementread(board, pt)
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
  if (memoryhassecretheap) {
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
  if (memoryhassecretheap) {
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
  memorygadgetinspectloaders(player, p1, p2)

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
      const element = memoryboardelementread(board, { x, y })
      const codepage = memorybookboardelementreadcodepage(mainbook, element)
      if (ispresent(codepage) && !ids.has(codepage.id)) {
        ids.add(codepage.id)
        gadgethyperlink(
          player,
          'batch',
          `edit @${memorycodepagereadname(codepage)}`,
          [`pageopen:${codepage.id}`],
        )
      }
    }
  }

  // board info
  memorygadgetinspectboard(player, board.id)
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
        const el = memoryboardelementread(board, pt)
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
        const el = memoryboardelementread(board, pt)
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
          const el = memoryboardelementread(board, { x, y })
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
  const element = memoryboardelementreadbyidorindex(board, inspect.target)
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
      memoryboardsafedelete(board, element, mainbook.timestamp)
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

  const stats = memorycodepagereadstatdefaults(codepage)
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
  memorygadgetinspectloaders(player, p1, p1)

  // codepage links
  gadgettext(player, `codepages:`)
  gadgethyperlink(
    player,
    'batch',
    `edit @${memorycodepagereadname(codepage)}`,
    [`pageopen:${codepage.id}`],
  )

  // board info
  memorygadgetinspectboard(player, board.id)
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
          const maybeobject = memoryboardelementread(board, { x, y })
          if (maybeobject?.category === CATEGORY.ISOBJECT) {
            memoryboardsafedelete(board, maybeobject, mainbook.timestamp)
          }
          memoryboardsetterrain(board, { x, y })
        }
      }
      break
    }
    case 'emptyobjects': {
      for (let y = p1.y; y <= p2.y; ++y) {
        for (let x = p1.x; x <= p2.x; ++x) {
          const maybeobject = memoryboardelementread(board, { x, y })
          if (maybeobject?.category === CATEGORY.ISOBJECT) {
            memoryboardsafedelete(board, maybeobject, mainbook.timestamp)
          }
        }
      }
      break
    }
    case 'emptyterrain': {
      for (let y = p1.y; y <= p2.y; ++y) {
        for (let x = p1.x; x <= p2.x; ++x) {
          memoryboardsetterrain(board, { x, y })
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

function chipfromelement(board: MAYBE<BOARD>, element: MAYBE<BOARD_ELEMENT>) {
  const id = element?.id ?? memoryboardelementindex(board, element)
  return `inspect:${id}`
}
