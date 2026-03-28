/**
 * Incremental `:drawdisplay`: fingerprints, cell dirtiness with 8-neighbor expansion,
 * and next-tick allow-lists. Non-local draw logic must call `memoryinvalidatedraw`.
 */
import { compile } from 'zss/lang/generator'
import { indextox, indextoy, pttoindex } from 'zss/mapping/2d'
import { createsid } from 'zss/mapping/guid'
import { MAYBE, ispresent } from 'zss/mapping/types'
import { NAME } from 'zss/words/types'

import { memoryreadidorindex } from './boardaccess'
import { memoryreadelementkind, memoryreadelementstat } from './boards'
import { BOARD, BOARD_ELEMENT, BOARD_HEIGHT, BOARD_WIDTH } from './types'

const DRAW_LABEL = 'drawdisplay'
const DRAWHASCACHE: Record<string, boolean> = {}

export function memorycodehasdrawdisplay(code: string) {
  const drawlabel = NAME(DRAW_LABEL)
  const key = `${drawlabel}:${code}`
  if (ispresent(DRAWHASCACHE[key])) {
    return DRAWHASCACHE[key]
  }
  const labels = compile('drawpass', code).labels ?? {}
  const result = ispresent(labels[drawlabel])
  DRAWHASCACHE[key] = result
  return result
}

export function memoryelementdrawreadid(element: BOARD_ELEMENT) {
  return element.id ?? `${memoryreadidorindex(element) ?? createsid()}`
}

function isactiveobject(object: BOARD_ELEMENT, timestamp: number) {
  if (!object.removed) {
    return true
  }
  const delta = timestamp - object.removed
  const cycle = memoryreadelementstat(object, 'cycle')
  return delta <= cycle
}

function elementdrawcode(element: BOARD_ELEMENT) {
  const kind = memoryreadelementkind(element)
  return `${kind?.code ?? ''}\n${element.code ?? ''}`
}

function memoryelementdrawfingerprint(element: BOARD_ELEMENT) {
  return [
    element.x ?? 0,
    element.y ?? 0,
    element.char ?? '',
    element.color ?? '',
    element.bg ?? '',
    element.displaychar ?? '',
    element.displaycolor ?? '',
    element.displaybg ?? '',
    element.light ?? '',
    element.lightdir ?? '',
    element.tickertext ?? '',
    element.removed ?? '',
    element.kind ?? '',
    element.code ?? '',
  ].join('|')
}

export function memoryinvalidatedraw(board: MAYBE<BOARD>) {
  if (!ispresent(board)) {
    return
  }
  board.drawneedfull = true
  delete board.drawlastfp
  delete board.drawlastxy
  delete board.drawallowids
}

function expandneighborcells(seed: Set<number>) {
  const expanded = new Set(seed)
  for (const idx of seed) {
    const x = indextox(idx, BOARD_WIDTH)
    const y = indextoy(idx, BOARD_WIDTH)
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) {
          continue
        }
        const nx = x + dx
        const ny = y + dy
        if (nx >= 0 && nx < BOARD_WIDTH && ny >= 0 && ny < BOARD_HEIGHT) {
          expanded.add(pttoindex({ x: nx, y: ny }, BOARD_WIDTH))
        }
      }
    }
  }
  return expanded
}

export function memoryupdatedrawdirty(board: MAYBE<BOARD>, timestamp: number) {
  if (!ispresent(board)) {
    return
  }
  const oldfp = board.drawlastfp ?? {}
  const oldxy = board.drawlastxy ?? {}
  const seedcells = new Set<number>()
  const nextfp: Record<string, string> = {}
  const nextxy: Record<string, { x: number; y: number }> = {}

  for (const id of Object.keys(oldxy)) {
    const o = board.objects[id]
    if (!ispresent(o) || !ispresent(o.id) || !isactiveobject(o, timestamp)) {
      const pt = oldxy[id]
      if (ispresent(pt)) {
        seedcells.add(pttoindex({ x: pt.x, y: pt.y }, BOARD_WIDTH))
      }
    }
  }

  for (let i = 0; i < board.terrain.length; ++i) {
    const terrain = board.terrain[i]
    if (!ispresent(terrain)) {
      continue
    }
    const code = elementdrawcode(terrain)
    if (!code) {
      continue
    }
    const readid = memoryelementdrawreadid(terrain)
    const fp = memoryelementdrawfingerprint(terrain)
    nextfp[readid] = fp
    if (oldfp[readid] !== fp) {
      seedcells.add(
        pttoindex({ x: terrain.x ?? 0, y: terrain.y ?? 0 }, BOARD_WIDTH),
      )
    }
  }

  const allobjects = Object.values(board.objects)
  for (let i = 0; i < allobjects.length; ++i) {
    const object = allobjects[i]
    if (!ispresent(object.id) || !isactiveobject(object, timestamp)) {
      continue
    }
    const code = elementdrawcode(object)
    if (!code) {
      continue
    }
    const readid = memoryelementdrawreadid(object)
    const fp = memoryelementdrawfingerprint(object)
    nextfp[readid] = fp
    const ox = object.x ?? 0
    const oy = object.y ?? 0
    nextxy[readid] = { x: ox, y: oy }
    if (oldfp[readid] !== fp) {
      seedcells.add(pttoindex({ x: ox, y: oy }, BOARD_WIDTH))
      const prev = oldxy[readid]
      if (ispresent(prev) && (prev.x !== ox || prev.y !== oy)) {
        seedcells.add(pttoindex({ x: prev.x, y: prev.y }, BOARD_WIDTH))
      }
    }
  }

  const oldkeys = Object.keys(oldfp)
  for (let i = 0; i < oldkeys.length; ++i) {
    const key = oldkeys[i]
    if (!(key in nextfp)) {
      if (ispresent(oldxy[key])) {
        const pt = oldxy[key]
        seedcells.add(pttoindex({ x: pt.x, y: pt.y }, BOARD_WIDTH))
      } else {
        const maybeidx = Number(key)
        if (
          Number.isInteger(maybeidx) &&
          maybeidx >= 0 &&
          maybeidx < board.terrain.length
        ) {
          seedcells.add(maybeidx)
        }
      }
    }
  }

  board.drawneedfull = false

  const expanded = expandneighborcells(seedcells)
  const allowids = new Set<string>()

  for (const idx of expanded) {
    const terrain = board.terrain[idx]
    if (ispresent(terrain)) {
      const code = elementdrawcode(terrain)
      if (code && memorycodehasdrawdisplay(code)) {
        allowids.add(memoryelementdrawreadid(terrain))
      }
    }
    const cx = indextox(idx, BOARD_WIDTH)
    const cy = indextoy(idx, BOARD_WIDTH)
    for (let j = 0; j < allobjects.length; ++j) {
      const object = allobjects[j]
      if (!ispresent(object.id) || !isactiveobject(object, timestamp)) {
        continue
      }
      if ((object.x ?? 0) === cx && (object.y ?? 0) === cy) {
        const code = elementdrawcode(object)
        if (code && memorycodehasdrawdisplay(code)) {
          allowids.add(memoryelementdrawreadid(object))
        }
      }
    }
  }

  board.drawlastfp = nextfp
  board.drawlastxy = nextxy
  board.drawallowids = allowids
}
