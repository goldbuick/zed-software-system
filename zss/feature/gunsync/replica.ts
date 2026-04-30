/**
 * Gunsync — single-document MEMORY replica; hub mesh carries Gun wire frames (`hubgunwire`); graph shape under [`roommirror`](./roommirror) `replica` subtree.
 */
import { MAYBE, ispresent } from 'zss/mapping/types'
import {
  memoryreadroot,
  memoryreadsession,
  memoryreadtopic,
  memoryresetbooks,
  memorysnapshotroot,
} from 'zss/memory/session'
import { BOOK } from 'zss/memory/types'

export type GunsyncReplica = {
  software: { main: string; temp: string }
  operator: string
  topic: string
  session: string
  halt: boolean
  simfreeze: boolean
  books: Record<string, BOOK>
}

export type GunsyncPayload = {
  v: number
  json: string
  /** boardrunner emits with source-of-truth stamp; avoids sim→br bounce on host. */
  source: 'boardrunner' | 'peer' | 'sim'
}

let applying_from_gun = false

/** True while flushing Gun graph deltas into MEMORY (skip graph echo bridges). */
export function gunsyncisapplyingfromgun(): boolean {
  return applying_from_gun
}

export function gunsyncwithapplyingfromgun(run: () => void): void {
  applying_from_gun = true
  try {
    run()
  } finally {
    applying_from_gun = false
  }
}

let gunsynclocalversion = 0
let gunsynclastapplied = 0

export function gunsyncroomkey(): string {
  const topic = memoryreadtopic()
  if (topic) {
    return topic
  }
  return memoryreadsession()
}

/** Monotonic replica version counter for this JS realm (boardrunner authoritative). */
export function gunsyncbumpversion(): number {
  gunsynclocalversion += 1
  return gunsynclocalversion
}

export function gunsyncreadversion(): number {
  return gunsynclocalversion
}

export function gunsyncsetversion(forced: number): void {
  if (forced > gunsynclocalversion) {
    gunsynclocalversion = forced
  }
}

export function gunsynccapture(): GunsyncReplica {
  const snap = memorysnapshotroot()
  return {
    software: { ...snap.software },
    operator: snap.operator,
    topic: snap.topic,
    session: snap.session,
    halt: snap.halt,
    simfreeze: snap.simfreeze,
    books: snap.books,
  }
}

export function gunsyncpayloadfromreplica(
  replica: GunsyncReplica,
  v: number,
  source: GunsyncPayload['source'],
): GunsyncPayload {
  return {
    v,
    json: JSON.stringify(replica),
    source,
  }
}

export function gunsyncreplicaisempty(replica: GunsyncReplica): boolean {
  return (
    replica.operator === '' &&
    replica.software.main === '' &&
    Object.keys(replica.books).length === 0
  )
}

function gunsynclocalhasbookcontent(): boolean {
  const root = memoryreadroot()
  return Boolean(root.software.main) || Object.keys(root.books).length > 0
}

/** Hub already bootstrapped (operator or books)—do not let empty BR snapshots wipe pilot id before loadmem. */
export function gunsynclocalhashubcontent(): boolean {
  const root = memoryreadroot()
  return root.operator !== '' || gunsynclocalhasbookcontent()
}

/** Apply replica into local MEMORY; preserves **loaders** only. `halt` / `simfreeze` follow replica (and Gun graph). */
export function gunsyncapplyreplica(replica: GunsyncReplica): void {
  const root = memoryreadroot()
  const loaders = root.loaders
  root.operator = replica.operator
  root.topic = replica.topic
  root.session = replica.session
  root.software = { ...replica.software }
  if (typeof replica.halt === 'boolean') {
    root.halt = replica.halt
  }
  if (typeof replica.simfreeze === 'boolean') {
    root.simfreeze = replica.simfreeze
  }
  memoryresetbooks(Object.values(replica.books))
  root.loaders = loaders
}

export function gunsyncapplyfromwire(data: MAYBE<GunsyncPayload>): boolean {
  if (
    !ispresent(data) ||
    typeof data.v !== 'number' ||
    typeof data.json !== 'string'
  ) {
    return false
  }
  let replica: GunsyncReplica
  try {
    replica = JSON.parse(data.json) as GunsyncReplica
    const root = memoryreadroot()
    if (typeof replica.halt !== 'boolean') {
      replica.halt = root.halt
    }
    if (typeof replica.simfreeze !== 'boolean') {
      replica.simfreeze = root.simfreeze
    }
    if (!replica.books || typeof replica.books !== 'object') {
      replica.books = {}
    }
    if (!replica.software) {
      replica.software = { main: '', temp: '' }
    }
  } catch {
    return false
  }
  if (
    data.source === 'boardrunner' &&
    gunsyncreplicaisempty(replica) &&
    gunsynclocalhashubcontent()
  ) {
    return false
  }
  if (data.v <= gunsynclastapplied) {
    return false
  }
  gunsynclastapplied = data.v
  if (data.v > gunsynclocalversion) {
    gunsynclocalversion = data.v
  }
  gunsyncapplyreplica(replica)
  return true
}

export function gunsyncresetdedup(): void {
  gunsynclastapplied = 0
  gunsynclocalversion = 0
}
