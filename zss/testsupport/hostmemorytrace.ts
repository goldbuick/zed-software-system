import { memoryreadelement, memoryreadterrain } from 'zss/memory/boardaccess'
import { memoryreadboardbyaddress } from 'zss/memory/boards'
import { memoryreadplayerboard } from 'zss/memory/playermanagement'
import { memoryreadoperator } from 'zss/memory/session'
import type { Operation } from 'zss/feature/jsonpipe/observe'
import type { BOARD, BOARD_ELEMENT } from 'zss/memory/types'
import type { PT, WORD } from 'zss/words/types'
import { ispresent } from 'zss/mapping/types'
import { maptonumber } from 'zss/mapping/value'

const DEBUG_ENDPOINT =
  'http://127.0.0.1:7474/ingest/f2bfd0d8-5208-447d-9aef-a3f39f2dbf4e'
const DEBUG_SESSION = '9bae57'

export type HOST_MEMORY_RECT_CELL = {
  x: number
  y: number
  char: number
  color: number
  bg: number
  kind: string
}

export type HOST_MEMORY_SNAPSHOT = {
  label: string
  boardid: string
  operator: string
  booktimestamp: number
  rect?: { p1: PT; p2: PT; cells: HOST_MEMORY_RECT_CELL[]; fingerprint: string }
  meta?: Record<string, unknown>
}

export type HOST_MEMORY_TRACE_EVENT = {
  phase: string
  hypothesisId: string
  player: string
  snapshot?: HOST_MEMORY_SNAPSHOT
  data?: Record<string, unknown>
  ts: number
}

let traceenabled = false
const tracesequence: HOST_MEMORY_TRACE_EVENT[] = []

function readcharfromelement(element: BOARD_ELEMENT | undefined): number {
  if (!ispresent(element)) {
    return 0
  }
  const raw = element.char
  return maptonumber(raw, 0)
}

function readcolorfromelement(element: BOARD_ELEMENT | undefined): number {
  if (!ispresent(element)) {
    return 0
  }
  return maptonumber(element.color, 0)
}

function readbgfromelement(element: BOARD_ELEMENT | undefined): number {
  if (!ispresent(element)) {
    return 0
  }
  return maptonumber(element.bg, 0)
}

function envflagenabled(raw: string | undefined): boolean {
  return raw === '1' || raw === 'true'
}

/** URL param overrides; otherwise reads `ZSS_HOST_MEM_TRACE` from `.env` / vite. */
export function ishostmemorytraceenabledfromconfig(): boolean {
  if (typeof window !== 'undefined') {
    const q = new URLSearchParams(window.location.search).get(
      'ZSS_HOST_MEM_TRACE',
    )
    if (envflagenabled(q ?? undefined)) {
      return true
    }
  }
  return envflagenabled(import.meta.env.ZSS_HOST_MEM_TRACE)
}

export function sethostmemtraceenabled(enabled: boolean): void {
  traceenabled = enabled
}

export function ishostmemorytraceenabled(): boolean {
  return traceenabled
}

export function snaphostrect(
  label: string,
  board: BOARD | undefined,
  p1: PT,
  p2: PT,
  meta?: Record<string, unknown>,
): HOST_MEMORY_SNAPSHOT | undefined {
  if (!ispresent(board)) {
    return undefined
  }
  const x1 = Math.min(p1.x, p2.x)
  const y1 = Math.min(p1.y, p2.y)
  const x2 = Math.max(p1.x, p2.x)
  const y2 = Math.max(p1.y, p2.y)
  const cells: HOST_MEMORY_RECT_CELL[] = []
  for (let y = y1; y <= y2; ++y) {
    for (let x = x1; x <= x2; ++x) {
      const element =
        memoryreadelement(board, { x, y }) ??
        memoryreadterrain(board, x, y)
      cells.push({
        x,
        y,
        char: readcharfromelement(element ?? undefined),
        color: readcolorfromelement(element ?? undefined),
        bg: readbgfromelement(element ?? undefined),
        kind: element?.kind ?? '',
      })
    }
  }
  const fingerprint = cells.map((c) => `${c.x},${c.y}:${c.char}`).join('|')
  return {
    label,
    boardid: board.id,
    operator: memoryreadoperator(),
    booktimestamp: board.timestamp ?? 0,
    rect: { p1: { x: x1, y: y1 }, p2: { x: x2, y: y2 }, cells, fingerprint },
    meta,
  }
}

export function snaphostboardbyid(
  label: string,
  boardid: string,
  p1?: PT,
  p2?: PT,
  meta?: Record<string, unknown>,
): HOST_MEMORY_SNAPSHOT | undefined {
  const board = memoryreadboardbyaddress(boardid)
  if (!ispresent(board)) {
    return {
      label,
      boardid,
      operator: memoryreadoperator(),
      booktimestamp: 0,
      meta: { ...meta, missingboard: true },
    }
  }
  if (ispresent(p1) && ispresent(p2)) {
    return snaphostrect(label, board, p1, p2, meta)
  }
  return {
    label,
    boardid: board.id,
    operator: memoryreadoperator(),
    booktimestamp: board.timestamp ?? 0,
    meta,
  }
}

function emittraceevent(event: HOST_MEMORY_TRACE_EVENT): void {
  tracesequence.push(event)
  // #region agent log
  fetch(DEBUG_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': DEBUG_SESSION,
    },
    body: JSON.stringify({
      sessionId: DEBUG_SESSION,
      location: 'zss/testsupport/hostmemorytrace.ts:emittraceevent',
      message: event.phase,
      hypothesisId: event.hypothesisId,
      data: {
        player: event.player,
        snapshot: event.snapshot,
        ...event.data,
        seq: tracesequence.length,
      },
      timestamp: event.ts,
    }),
  }).catch(() => {})
  // #endregion
}

export function tracehostmemory(
  phase: string,
  hypothesisid: string,
  player: string,
  snapshot?: HOST_MEMORY_SNAPSHOT,
  data?: Record<string, unknown>,
): void {
  if (!traceenabled) {
    return
  }
  emittraceevent({
    phase,
    hypothesisId: hypothesisid,
    player,
    snapshot,
    data,
    ts: Date.now(),
  })
}

export function tracehostmemorymilestone(
  name: string,
  data?: Record<string, unknown>,
): void {
  tracehostmemory('manual:milestone', 'H0', memoryreadoperator(), undefined, {
    name,
    ...data,
  })
}

export function tracehostchareditwrite(
  player: string,
  boardid: string,
  typ: string,
  name: string,
  value: WORD,
  p1?: PT,
  p2?: PT,
): void {
  if (!traceenabled || typ !== 'charedit') {
    return
  }
  const snapshot =
    ispresent(p1) && ispresent(p2)
      ? snaphostboardbyid('before-charedit-write', boardid, p1, p2, {
          field: name,
          value,
        })
      : snaphostboardbyid('before-charedit-write', boardid, undefined, undefined, {
          field: name,
          value,
        })
  tracehostmemory('charedit:setvalue', 'H3', player, snapshot, {
    typ,
    name,
    value,
    boardid,
  })
}

export function tracehostbatchchars(
  player: string,
  p1: PT,
  p2: PT,
  source: string,
): void {
  if (!traceenabled) {
    return
  }
  const board = memoryreadplayerboard(player)
  const snapshot = ispresent(board)
    ? snaphostrect(`batch-chars:${source}`, board, p1, p2, { source })
    : undefined
  tracehostmemory('batch:chars', 'H4', player, snapshot, { source, p1, p2 })
}

export function tracehostmemorypatch(
  player: string,
  opcount: number,
  ok: boolean,
  boundary?: string,
  operations?: Operation[],
): void {
  if (!traceenabled) {
    return
  }
  const paths = (operations ?? [])
    .slice(0, 12)
    .map((op) => String((op as { path?: string }).path ?? ''))
  const isboundary = !!boundary
  const phase = isboundary
    ? ok
      ? 'boundary:patch:ok'
      : 'boundary:patch:fail'
    : ok
      ? 'memory:patch:ok'
      : 'memory:patch:fail'
  tracehostmemory(phase, isboundary ? 'H12' : 'H2', player, undefined, {
    opcount,
    ok,
    boundary: boundary ?? '',
    charops: paths.filter((p) => p.includes('/char')).length,
    terrainops: paths.filter((p) => p.includes('/terrain/')).length,
    samplepaths: paths,
  })
}

export function readhostmemorytrace(): HOST_MEMORY_TRACE_EVENT[] {
  return [...tracesequence]
}

export function clearhostmemorytrace(): void {
  tracesequence.length = 0
}
