import { MAYBE } from 'zss/mapping/types'
import {
  READ_LAYER,
  memoryreadelement,
} from 'zss/memory/boardaccess'
import {
  memoryreadboardbyevaldir,
  memoryreadelementstat,
} from 'zss/memory/boards'
import { BOARD_ELEMENT } from 'zss/memory/types'

import { READ_CONTEXT, readargs } from './reader'
import { ARG_TYPE, NAME, WORD } from './types'

/** Remote attrs for Weave-like pget / #pset. */
const REMOTE_STAT_NAMES = new Set([
  'p1',
  'p2',
  'p3',
  'p4',
  'p5',
  'p6',
  'p7',
  'p8',
  'p9',
  'p10',
  'p11',
  'p12',
  'p13',
  'p14',
  'p15',
  'p16',
  'p17',
  'p18',
  'p19',
  'p20',
  'cycle',
  'stepx',
  'stepy',
  'char',
  'color',
  'bg',
  'x',
  'y',
])

export function mapremotestatname(name: string): string {
  switch (NAME(name)) {
    case 'intel':
    case 'intelligence':
      return 'p1'
    case 'speed':
    case 'rate':
      return 'p2'
    case 'thisx':
      return 'x'
    case 'thisy':
      return 'y'
    default:
      return NAME(name)
  }
}

export function isremotestatname(name: string): boolean {
  return REMOTE_STAT_NAMES.has(mapremotestatname(name))
}

/** PGET / #PSET first arg: DIR only → element at dest. */
export function resolveremotedir(
  words: WORD[],
  index: number,
): [MAYBE<BOARD_ELEMENT>, number] {
  const [dest, ii] = readargs(words, index, [ARG_TYPE.DIR])
  const board = memoryreadboardbyevaldir(dest, READ_CONTEXT.board)
  if (dest.targets.length) {
    return [memoryreadelement(board, dest.targets[0], READ_LAYER.ANY), ii]
  }
  return [memoryreadelement(board, dest.destpt, READ_LAYER.ANY), ii]
}

export function readremoteattr(element: BOARD_ELEMENT, attr: string): WORD {
  const statname = mapremotestatname(attr)
  if (statname === 'id') {
    return element.id ?? ''
  }
  if (statname === 'x') {
    return element.x ?? 0
  }
  if (statname === 'y') {
    return element.y ?? 0
  }
  if (statname === 'color') {
    return element.color ?? 0
  }
  if (statname === 'bg') {
    return element.bg ?? 0
  }
  if (REMOTE_STAT_NAMES.has(statname)) {
    const value = memoryreadelementstat(
      element,
      statname as Parameters<typeof memoryreadelementstat>[1],
    )
    return (value ?? 0) as WORD
  }
  return 0
}
