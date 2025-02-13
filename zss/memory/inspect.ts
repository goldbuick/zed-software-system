import { objectKeys } from 'ts-extras'
import {
  gadgetcheckqueue,
  gadgethyperlink,
  gadgetstate,
  gadgettext,
} from 'zss/gadget/data/api'
import { isarray, ispresent, isstring, MAYBE } from 'zss/mapping/types'
import { CATEGORY, COLLISION, PT, WORD } from 'zss/words/types'

import { boardelementindex, boardelementread } from './board'
import { bookreadcodepagewithtype } from './book'
import { codepagereadstatdefaults } from './codepage'
import { BOARD, BOARD_ELEMENT, CODE_PAGE, CODE_PAGE_TYPE } from './types'

import {
  MEMORY_LABEL,
  memoryensuresoftwarebook,
  memoryreadplayerboard,
} from '.'

const DIVIDER = '$yellow$205$205$205$196'

function chipfromelement(board: MAYBE<BOARD>, element: MAYBE<BOARD_ELEMENT>) {
  const id = element?.id ? element.id : boardelementindex(board, element)
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
  gadgethyperlink(player, chip, 'color', ['coloredit', name], get, set)

  // send to player as a scroll
  const shared = gadgetstate(player)
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
  gadgethyperlink(player, chip, 'char', ['charedit', name], get, set)

  // send to player as a scroll
  const shared = gadgetstate(player)
  shared.scroll = gadgetcheckqueue(player)
}

function memoryinspectelement(
  player: string,
  board: BOARD,
  codepage: CODE_PAGE,
  element: BOARD_ELEMENT,
  p1: PT,
  isobject: boolean,
) {
  // element stat accessors
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

  if (isobject) {
    gadgettext(
      player,
      `object: ${element.name ?? element.kind ?? 'ERR'} ${p1.x}, ${p1.y}`,
    )
  } else {
    gadgettext(player, `terrain: ${element.kind ?? 'ERR'} ${p1.x}, ${p1.y}`)
  }
  gadgettext(player, DIVIDER)
  const chip = chipfromelement(board, element)
  if (isobject) {
    gadgethyperlink(
      player,
      chip,
      'cycle',
      ['number', 'cycle', '1', '255'],
      get,
      set,
    )
    gadgethyperlink(
      player,
      chip,
      'collision',
      [
        'select',
        'collision',
        'iswalking',
        `${COLLISION.ISWALK}`,
        'isswimming',
        `${COLLISION.ISSWIM}`,
        'isbullet',
        `${COLLISION.ISBULLET}`,
      ],
      get,
      set,
    )
  } else {
    gadgethyperlink(
      player,
      chip,
      'collision',
      [
        'select',
        'collision',
        'iswalkable',
        `${COLLISION.ISWALK}`,
        'issolid',
        `${COLLISION.ISSOLID}`,
        'iswim',
        `${COLLISION.ISSWIM}`,
      ],
      get,
      set,
    )
  }
  if (isobject) {
    gadgethyperlink(
      player,
      chip,
      'pushable',
      ['select', 'pushable', 'no', '0', 'yes', '1'],
      get,
      set,
    )
  }
  gadgethyperlink(
    player,
    chip,
    'destructible',
    ['select', 'destructible', 'no', '0', 'yes', '1'],
    get,
    set,
  )

  const stats = codepagereadstatdefaults(codepage)
  const targets = objectKeys(stats)
  for (let i = 0; i < targets.length; ++i) {
    const target = targets[i]
    switch (target) {
      case 'char':
      case 'cycle':
      case 'color':
      case 'bg':
      case 'collision':
      case 'pushable':
      case 'destructible':
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
              [type, target, ...args],
              get,
              set,
            )
          }
        }
        break
    }
  }

  gadgettext(player, DIVIDER)

  gadgethyperlink(
    player,
    chip,
    `char: ${element.char ?? element.kinddata?.char ?? 1}`,
    ['hk', 'char', 'a', ' A ', 'next'],
    get,
    set,
  )
  gadgethyperlink(
    player,
    chip,
    `color: ${element.color ?? element.kinddata?.color ?? 15}`,
    ['hk', 'color', 'c', ' C ', 'next'],
    get,
    set,
  )
  gadgethyperlink(
    player,
    chip,
    `bg: ${element.bg ?? element.kinddata?.bg ?? 0}`,
    ['hk', 'bg', 'b', ' B ', 'next'],
    get,
    set,
  )
}

function memoryinspectarea(player: string, p1: PT, p2: PT) {
  function get() {
    return 0
  }
  function set() {
    //
  }

  const area = `${p1.x},${p1.y},${p2.x},${p2.y}`

  gadgettext(player, `selected: ${p1.x},${p1.y} - ${p2.x},${p2.y}`)
  gadgettext(player, DIVIDER)

  gadgethyperlink(
    player,
    'inspect',
    'copy elements',
    ['hk', `copy:${area}`, '1'],
    get,
    set,
  )
  gadgethyperlink(
    player,
    'inspect',
    'make empty',
    ['hk', `empty:${area}`, '2'],
    get,
    set,
  )

  gadgettext(player, DIVIDER)

  gadgethyperlink(
    player,
    'inspect',
    `set chars:`,
    ['hk', `chars:${area}`, 'a', ' A ', 'next'],
    get,
    set,
  )
  gadgethyperlink(
    player,
    'inspect',
    `set colors:`,
    ['hk', `colors:${area}`, 'c', ' C ', 'next'],
    get,
    set,
  )
  gadgethyperlink(
    player,
    'inspect',
    `set bgs:`,
    ['hk', `bgs:${area}`, 'b', ' B ', 'next'],
    get,
    set,
  )
}

export function memoryinspect(player: string, p1: PT, p2: PT) {
  const mainbook = memoryensuresoftwarebook(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }

  const board = memoryreadplayerboard(player)
  if (!ispresent(board)) {
    return
  }

  if (p1.x === p2.x && p1.y === p2.y) {
    const element = boardelementread(board, p1)
    if (ispresent(element)) {
      // figure out stats from kind codepage
      const terrainpage = bookreadcodepagewithtype(
        mainbook,
        CODE_PAGE_TYPE.TERRAIN,
        element.kind ?? '',
      )
      if (ispresent(terrainpage)) {
        memoryinspectelement(player, board, terrainpage, element, p1, false)
      }
      const objectpage = bookreadcodepagewithtype(
        mainbook,
        CODE_PAGE_TYPE.OBJECT,
        element.kind ?? '',
      )
      if (ispresent(objectpage)) {
        memoryinspectelement(player, board, objectpage, element, p1, true)
      }
    } else {
      gadgettext(player, `empty: ${p1.x}, ${p1.y}`)
      gadgettext(player, DIVIDER)
    }
  } else {
    memoryinspectarea(player, p1, p2)
  }

  // send to player as a scroll
  const shared = gadgetstate(player)
  shared.scroll = gadgetcheckqueue(player)
}
