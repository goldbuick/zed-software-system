/**
 * Gunsync — single-document MEMORY replica over hub MESSAGE (topic + boardrunner).
 * gun.js graph lives in [`roommirror`](./roommirror); this module is capture/apply of the JSON replica.
 */
import { MAYBE, ispresent } from 'zss/mapping/types'
import { BOOK } from 'zss/memory/types'
import {
  memoryreadroot,
  memoryreadsession,
  memoryreadtopic,
  memoryresetbooks,
} from 'zss/memory/session'

export type GunsyncReplica = {
  software: { main: string; temp: string }
  operator: string
  topic: string
  session: string
  books: Record<string, BOOK>
}

export type GunsyncPayload = {
  v: number
  json: string
  /** boardrunner emits with source-of-truth stamp; avoids sim→br bounce on host. */
  source: 'boardrunner' | 'peer' | 'sim'
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

function capturebooks(): Record<string, BOOK> {
  const root = memoryreadroot()
  return JSON.parse(JSON.stringify(root.books)) as Record<string, BOOK>
}

export function gunsynccapture(): GunsyncReplica {
  const root = memoryreadroot()
  return {
    software: { ...root.software },
    operator: root.operator,
    topic: root.topic,
    session: root.session,
    books: capturebooks(),
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

function gunsyncreplicaisempty(replica: GunsyncReplica): boolean {
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
function gunsynclocalhashubcontent(): boolean {
  const root = memoryreadroot()
  return root.operator !== '' || gunsynclocalhasbookcontent()
}

/** Apply replica into local MEMORY, preserving loaders / halt / simfreeze. */
export function gunsyncapplyreplica(replica: GunsyncReplica): void {
  const root = memoryreadroot()
  const loaders = root.loaders
  const halt = root.halt
  const simfreeze = root.simfreeze
  root.operator = replica.operator
  root.topic = replica.topic
  root.session = replica.session
  root.software = { ...replica.software }
  memoryresetbooks(Object.values(replica.books))
  root.loaders = loaders
  root.halt = halt
  root.simfreeze = simfreeze
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
