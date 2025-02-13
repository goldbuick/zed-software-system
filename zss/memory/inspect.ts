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

export function memoryinspect(player: string, p1: PT, p2: PT) {
  const mainbook = memoryensuresoftwarebook(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }

  const board = memoryreadplayerboard(player)
  if (!ispresent(board)) {
    return
  }

  // element stat accessors
  let element: MAYBE<BOARD_ELEMENT>
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

  // common hyperlinks
  function elementinspect(
    element: BOARD_ELEMENT,
    codepage: CODE_PAGE,
    isobject: boolean,
  ) {
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
      ['hk', 'char', 'a'],
      get,
      set,
    )
    gadgethyperlink(
      player,
      chip,
      `color: ${element.color ?? element.kinddata?.color ?? 15}`,
      ['hk', 'color', 'c'],
      get,
      set,
    )
    gadgethyperlink(
      player,
      chip,
      `bg: ${element.bg ?? element.kinddata?.bg ?? 0}`,
      ['hk', 'bg', 'b'],
      get,
      set,
    )
  }

  if (p1.x === p2.x && p1.y === p2.y) {
    element = boardelementread(board, p1)
    if (ispresent(element)) {
      // figure out stats from kind codepage
      const terrainpage = bookreadcodepagewithtype(
        mainbook,
        CODE_PAGE_TYPE.TERRAIN,
        element.kind ?? '',
      )
      if (ispresent(terrainpage)) {
        elementinspect(element, terrainpage, false)
      }
      const objectpage = bookreadcodepagewithtype(
        mainbook,
        CODE_PAGE_TYPE.OBJECT,
        element.kind ?? '',
      )
      if (ispresent(objectpage)) {
        elementinspect(element, objectpage, true)
      }
    } else {
      gadgettext(player, `empty: ${p1.x}, ${p1.y}`)
      gadgettext(player, DIVIDER)
    }
  } else {
    gadgettext(player, `selected: ${p1.x},${p1.y} - ${p2.x},${p2.y}`)
    gadgettext(player, '$205$205$205$196')
    gadgethyperlink(
      player,
      'inspect',
      'copy elements',
      ['hk', `copy:${p1.x},${p1.y},${p2.x},${p2.y}`, 'c'],
      get,
      set,
    )
    gadgethyperlink(
      player,
      'inspect',
      'make empty',
      ['hk', `empty:${p1.x},${p1.y},${p2.x},${p2.y}`, 'e'],
      get,
      set,
    )
  }

  // send to player as a scroll
  const shared = gadgetstate(player)
  shared.scroll = gadgetcheckqueue(player)
}
