import { objectKeys } from 'ts-extras'
import { DIVIDER } from 'zss/feature/writeui'
import {
  gadgetcheckqueue,
  gadgethyperlink,
  gadgetstate,
  gadgettext,
} from 'zss/gadget/data/api'
import { CYCLE_DEFAULT } from 'zss/mapping/tick'
import { isarray, ispresent, isstring, MAYBE } from 'zss/mapping/types'
import { CATEGORY, COLLISION, PT, WORD } from 'zss/words/types'

import { boardelementindex } from './board'
import { codepagereadname, codepagereadstatdefaults } from './codepage'
import { BOARD, BOARD_ELEMENT, CODE_PAGE, CODE_PAGE_TYPE } from './types'

import {
  MEMORY_LABEL,
  memoryelementstatread,
  memoryensuresoftwarebook,
  memorypickcodepagewithtype,
  memoryreadplayerboard,
} from '.'

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
  gadgethyperlink(player, chip, 'color', [name, 'coloredit'], get, set)

  // send to player as a scroll
  const shared = gadgetstate(player)
  shared.scrollname = 'color'
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
    // ensure proper defaults
    if (!ispresent(value)) {
      switch (name) {
        case 'color':
          return 15
        case 'bg':
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
  }

  if (isobject) {
    const pushable = memoryelementstatread(element, 'pushable')
    gadgettext(player, `ispushable: ${pushable ? pushable : `no`}`)
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

  gadgettext(player, DIVIDER)
  gadgethyperlink(player, chip, `make empty`, ['empty', 'hk', '0'], get, set)

  // codepage links
  gadgettext(player, DIVIDER)
  gadgethyperlink(player, 'batch', `edit @board codepage`, [
    `pageopen:${board.id}`,
  ])
  gadgethyperlink(player, 'batch', `edit @${codepagereadname(codepage)}`, [
    `pageopen:${codepage.id}`,
  ])

  // board info
  const boardcodepage = memorypickcodepagewithtype(
    CODE_PAGE_TYPE.BOARD,
    board.id,
  )
  gadgettext(player, codepagereadname(boardcodepage))
  gadgethyperlink(player, 'batch', `id ${board.id}`, ['', 'copyit', board.id])
  gadgethyperlink(player, 'batch', `edit @board codepage`, [
    `pageopen:${board.id}`,
  ])
}
