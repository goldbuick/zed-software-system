import { parsetarget } from 'zss/device'
import {
  gadgetcheckqueue,
  gadgethyperlink,
  gadgetstate,
  gadgettext,
} from 'zss/gadget/data/api'
import { rectpoints } from 'zss/mapping/2d'
import { isnumber, ispresent, isstring } from 'zss/mapping/types'
import { PT, WORD } from 'zss/words/types'

import { boardelementread } from './board'
import { hassecretheap } from './inspectcopypaste'
import { BOARD_ELEMENT } from './types'

import { memoryreadplayerboard } from '.'

const DIVIDER = '$yellow$205$205$205$196'

function ptstoarea(p1: PT, p2: PT) {
  return `${p1.x},${p1.y},${p2.x},${p2.y}`
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
    console.info('memoryinspectcolorarea', name, value)
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
    'color',
    [name, 'coloredit'],
    get,
    set,
  )

  // send to player as a scroll
  const shared = gadgetstate(player)
  shared.scroll = gadgetcheckqueue(player)
}

export const memoryinspectremix = {
  stat: '',
  patternsize: 2,
  mirror: 1,
}
type INSPECTVAR = keyof typeof memoryinspectremix

export function memoryinspectarea(player: string, p1: PT, p2: PT) {
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
  if (hassecretheap()) {
    gadgethyperlink(player, 'batch', 'paste elements', [
      `paste:${area}`,
      'hk',
      '2',
      ` 2 `,
      'next',
    ])
  }
  gadgethyperlink(player, 'batch', 'copy coords', [
    `copycoords:${area}`,
    'hk',
    '5',
    ` 5 `,
  ])

  function get(name: string) {
    const { target } = parsetarget(name)
    // console.info('#### get', target)
    return memoryinspectremix[target as INSPECTVAR]
  }
  function set(name: string, value: WORD) {
    if (isnumber(value) || isstring(value)) {
      const { target } = parsetarget(name)
      // console.info('#### set', target, value)
      // @ts-expect-error bah
      memoryinspectremix[target as INSPECTVAR] = value
    }
  }

  gadgethyperlink(player, 'batch', 'remix', [`stat:${area}`, 'text'], get, set)
  gadgethyperlink(
    player,
    'batch',
    'patternsize',
    [`patternsize:${area}`, 'number', '1', '5'],
    get,
    set,
  )
  gadgethyperlink(
    player,
    'batch',
    'mirror',
    [`mirror:${area}`, 'number', '1', '8'],
    get,
    set,
  )
  gadgethyperlink(player, 'batch', 'run', [
    `remixrun:${area}`,
    'hk',
    'r',
    ` R `,
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
}
