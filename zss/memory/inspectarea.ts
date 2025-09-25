import { DIVIDER } from 'zss/feature/writeui'
import {
  gadgetcheckqueue,
  gadgethyperlink,
  gadgetstate,
  gadgettext,
} from 'zss/gadget/data/api'
import { ptstoarea, rectpoints } from 'zss/mapping/2d'
import { isnumber, ispresent } from 'zss/mapping/types'
import { PT, WORD } from 'zss/words/types'

import { boardelementread } from './board'
import { bookboardelementreadcodepage } from './book'
import { codepagereadname } from './codepage'
import { BOARD_ELEMENT, CODE_PAGE_TYPE } from './types'

import {
  MEMORY_LABEL,
  memoryensuresoftwarebook,
  memorypickcodepagewithtype,
  memoryreadplayerboard,
} from '.'

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

  gadgettext(player, DIVIDER)
  gadgethyperlink(player, 'batch', 'make empty', [
    `empty:${area}`,
    'hk',
    '0',
    ` 0 `,
    'next',
  ])

  // codepage links
  gadgettext(player, DIVIDER)
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
