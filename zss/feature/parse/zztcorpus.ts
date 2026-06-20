/**
 * Extract ZZT OOP from parsed boards into ZSS codepage text (corpus pipeline).
 */

import { isnumber, ispresent, isstring } from 'zss/mapping/types'

import type { ZZT_BOARD, ZZT_STAT } from './zztformattypes'
import { zztoop } from './zztoop'

const ZZT_TILE_SCROLL = 10
const ZZT_TILE_PASSAGE = 11
const ZZT_TILE_DUPLICATOR = 12
const ZZT_TILE_BOMB = 13
const ZZT_TILE_BULLET = 18
const ZZT_TILE_BLINKWALL = 29
const ZZT_TILE_TRANSPORTER = 30
const ZZT_TILE_BEAR = 34
const ZZT_TILE_RUFFIAN = 35
const ZZT_TILE_OBJECT = 36
const ZZT_TILE_SLIME = 37
const ZZT_TILE_SHARK = 38
const ZZT_TILE_SPINNINGGUN = 39
const ZZT_TILE_PUSHER = 40
const ZZT_TILE_LION = 41
const ZZT_TILE_TIGER = 42
const ZZT_TILE_BLINKNS = 43
const ZZT_TILE_HEAD = 44
const ZZT_TILE_SEGMENT = 45
const ZZT_TILE_CUSTOMTEXT = 46
const ZZT_TEXT_BLOCK_START = 47

export type ZZT_BOARD_LAYOUT = {
  tilewidth: number
  tileheight: number
  kind: 'zzt' | 'szzt'
}

export type ZztCorpusElement = {
  statindex: number
  stat: ZZT_STAT
  tiletype: number
  tilecolor: number
  kind: string
  code: string
  boardname: string
  boardindex: number
}

export function zztkindfromtile(type: number): string | undefined {
  if (type >= ZZT_TEXT_BLOCK_START) {
    return 'text'
  }
  switch (type) {
    case ZZT_TILE_SCROLL:
      return 'scroll'
    case ZZT_TILE_PASSAGE:
      return 'passage'
    case ZZT_TILE_DUPLICATOR:
      return 'duplicator'
    case ZZT_TILE_BOMB:
      return 'bomb'
    case ZZT_TILE_BULLET:
      return 'bullet'
    case ZZT_TILE_BLINKWALL:
      return 'blinkwall'
    case ZZT_TILE_TRANSPORTER:
      return 'transporter'
    case ZZT_TILE_BEAR:
      return 'bear'
    case ZZT_TILE_RUFFIAN:
      return 'ruffian'
    case ZZT_TILE_OBJECT:
      return 'object'
    case ZZT_TILE_SLIME:
      return 'slime'
    case ZZT_TILE_SHARK:
      return 'shark'
    case ZZT_TILE_SPINNINGGUN:
      return 'spinninggun'
    case ZZT_TILE_PUSHER:
      return 'pusher'
    case ZZT_TILE_LION:
      return 'lion'
    case ZZT_TILE_TIGER:
      return 'tiger'
    case ZZT_TILE_BLINKNS:
      return 'blinkns'
    case ZZT_TILE_HEAD:
      return 'head'
    case ZZT_TILE_SEGMENT:
      return 'segment'
    case ZZT_TILE_CUSTOMTEXT:
      return 'text'
    default:
      return undefined
  }
}

export function zzttypewantsstat(tiletype: number): boolean {
  return zztkindfromtile(tiletype) !== undefined
}

export function resolvestatcode(
  stat: ZZT_STAT,
  stats: ZZT_STAT[],
): string | undefined {
  void stats
  if (ispresent(stat.bind) && stat.bind > 0) {
    return undefined
  }
  if (!isstring(stat.code) || !stat.code.trim()) {
    return undefined
  }
  return stat.code
}

export function boardcodedelements(
  board: ZZT_BOARD,
  layout: ZZT_BOARD_LAYOUT,
  boardindex: number,
): ZztCorpusElement[] {
  const { tilewidth, tileheight } = layout
  const out: ZztCorpusElement[] = []

  for (let si = 0; si < board.stats.length; ++si) {
    const stat = board.stats[si]
    if (ispresent(stat.bind) && stat.bind > 0) {
      continue
    }
    const code = resolvestatcode(stat, board.stats)
    if (!code) {
      continue
    }

    const x = stat.x
    const y = stat.y
    if (
      !isnumber(x) ||
      !isnumber(y) ||
      x < 0 ||
      y < 0 ||
      x >= tilewidth ||
      y >= tileheight
    ) {
      continue
    }

    const tileindex = x + y * tilewidth
    const tile = board.elements[tileindex]
    if (!ispresent(tile)) {
      continue
    }
    if (!zzttypewantsstat(tile.type)) {
      continue
    }

    const kind = zztkindfromtile(tile.type)
    if (!kind) {
      continue
    }

    out.push({
      statindex: si,
      stat,
      tiletype: tile.type,
      tilecolor: tile.color,
      kind,
      code,
      boardname: board.boardname,
      boardindex,
    })
  }

  return out
}

export function elementtozss(element: ZztCorpusElement): string {
  const lines: string[] = []
  lines.push(`@${element.kind}`)

  const { stat, tiletype, tilecolor } = element
  if (isnumber(stat.cycle) && stat.cycle !== 0) {
    lines.push(`@cycle ${stat.cycle}`)
  }
  if (isnumber(stat.stepx) && stat.stepx !== 0) {
    lines.push(`@stepx ${stat.stepx}`)
  }
  if (isnumber(stat.stepy) && stat.stepy !== 0) {
    lines.push(`@stepy ${stat.stepy}`)
  }

  const fg = tilecolor % 16
  const bg = Math.floor(tilecolor / 16)
  lines.push(`@color ${fg}`)
  if (bg !== 0) {
    lines.push(`@bg ${bg}`)
  }

  if (tiletype === ZZT_TILE_OBJECT) {
    if (isnumber(stat.p1) && stat.p1 !== 0) {
      lines.push(`@char ${stat.p1}`)
    }
  } else if (
    tiletype === ZZT_TILE_CUSTOMTEXT ||
    tiletype >= ZZT_TEXT_BLOCK_START
  ) {
    lines.push(`@char ${tilecolor}`)
  } else {
    if (isnumber(stat.p1) && stat.p1 !== 0) {
      lines.push(`@p1 ${stat.p1}`)
    }
    if (isnumber(stat.p2) && stat.p2 !== 0) {
      lines.push(`@p2 ${stat.p2}`)
    }
    if (isnumber(stat.p3) && stat.p3 !== 0) {
      lines.push(`@p3 ${stat.p3}`)
    }
  }

  lines.push(zztoop(element.code))
  return `${lines.join('\n')}\n`
}

export function corpusidslug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

export function corpusentryid(parts: {
  archivename: string
  sourcestem: string
  boardindex: number
  statindex: number
  kind: string
}): string {
  return `${corpusidslug(parts.archivename)}__${corpusidslug(parts.sourcestem)}__b${parts.boardindex}__s${parts.statindex}__${parts.kind}`
}

export function layoutfromkind(kind: 'zzt' | 'szzt'): ZZT_BOARD_LAYOUT {
  if (kind === 'szzt') {
    return { tilewidth: 96, tileheight: 80, kind: 'szzt' }
  }
  return { tilewidth: 60, tileheight: 25, kind: 'zzt' }
}
