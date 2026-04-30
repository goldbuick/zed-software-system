import { createhubsession } from 'zss/feature/jsondiffsync/session'
import {
  JSONDIFFSYNC_STREAM_BOARD,
  JSONDIFFSYNC_STREAM_FLAGS,
  JSONDIFFSYNC_STREAM_MEMORY,
  type HUB_SESSION,
  type JSON_DOCUMENT,
  type LEAF_SESSION,
} from 'zss/feature/jsondiffsync/types'
import { memoryreadboardbyaddress } from 'zss/memory/boards'
import { memoryreadbookbysoftware } from 'zss/memory/session'
import { MEMORY_LABEL } from 'zss/memory/types'

/** Path bodies (no leading `/`) stripped on the memory root hub so `flags` stream owns `book.flags`. */
export function computememorystreamingorepathprefixes(): string[] {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!mainbook) {
    return []
  }
  return [`books/${mainbook.id}/flags`]
}

export function refreshmemoryhubstreamingore(hub: HUB_SESSION): void {
  if (hub.streamid !== JSONDIFFSYNC_STREAM_MEMORY) {
    return
  }
  const px = computememorystreamingorepathprefixes()
  hub.streamingorepathprefixes.length = 0
  hub.streamingorepathprefixes.push(...px)
}

export function refreshmemoryleafstreamingore(session: LEAF_SESSION): void {
  if (session.streamid !== JSONDIFFSYNC_STREAM_MEMORY) {
    return
  }
  const px = computememorystreamingorepathprefixes()
  session.streamingorepathprefixes.length = 0
  session.streamingorepathprefixes.push(...px)
}

let jsondiffsynflagshubcache: HUB_SESSION | undefined
let jsondiffsynflagshubflagsref: object | undefined

/** Authoritative `mainbook.flags`; lazily rebuilt if book or flags object identity changes. */
export function ensurejsondiffsynflagshub(): HUB_SESSION | undefined {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!mainbook) {
    jsondiffsynflagshubcache = undefined
    jsondiffsynflagshubflagsref = undefined
    return undefined
  }
  const flags = mainbook.flags as object
  if (jsondiffsynflagshubcache && jsondiffsynflagshubflagsref === flags) {
    return jsondiffsynflagshubcache
  }
  jsondiffsynflagshubcache = createhubsession(
    mainbook.flags as JSON_DOCUMENT,
    JSONDIFFSYNC_STREAM_FLAGS,
    [],
  )
  jsondiffsynflagshubflagsref = flags
  return jsondiffsynflagshubcache
}

const jsondiffsynboardhubs = new Map<string, HUB_SESSION>()

export function boardsynensurehub(boardaddress: string): HUB_SESSION | undefined {
  const boarddoc = memoryreadboardbyaddress(boardaddress)
  if (!boarddoc) {
    jsondiffsynboardhubs.delete(boardaddress)
    return undefined
  }
  const prev = jsondiffsynboardhubs.get(boardaddress)
  if (prev && prev.working === boarddoc) {
    return prev
  }
  const hub = createhubsession(
    boarddoc,
    JSONDIFFSYNC_STREAM_BOARD,
    [],
    boardaddress,
  )
  jsondiffsynboardhubs.set(boardaddress, hub)
  return hub
}

export type HUBSYNCWIREMETA = {
  streamid: string
  boardsynctarget?: string
}
