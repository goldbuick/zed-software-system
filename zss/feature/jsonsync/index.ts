/*
jsonsync: differential synchronization for json documents using json-diff-ts.

Adapted from Neil Fraser's Differential Synchronization (2009). One authoritative
document lives on the server. Each (stream, player) pair maintains a shadow on the
server and a mirror shadow on the client. A sync tuple [cv, sv] rides on every
patch so both sides detect drift and can request a fresh snapshot.

We use json-diff-ts v4 (stable). v4 ships `diff` / `applyChangeset` /
`revertChangeset` with key-based array identity (`embeddedObjKeys`) and JSONPath
filter paths — same algorithm as the v5 atom API, just without the envelope. The
wire payload is a `Changeset` (IChange[]); anti-patches are sent as the SAME
changeset with a flag and the receiver uses `revertChangeset` to undo.
*/
import {
  Changeset,
  EmbeddedObjKeysType,
  applyChangeset,
  diff,
  revertChangeset,
} from 'json-diff-ts'
import {
  deepcopy,
  isarray,
  isnumber,
  ispresent,
  isstring,
} from 'zss/mapping/types'

export type JSONSYNC_ARRAY_KEYS = EmbeddedObjKeysType

export type JSONSYNC_STREAM_OPTIONS = {
  arrayidentitykeys?: JSONSYNC_ARRAY_KEYS
  // shallow top-level key allowlist. when present and non-empty, every
  // document written to the stream (create + update) is projected to only
  // these top-level keys before diff/patch/snapshot.
  topkeys?: string[]
}

export type JSONSYNC_SERVER_CLIENT_STATE = {
  shadow: unknown
  cv: number
  sv: number
  writable: boolean
}

export type JSONSYNC_SERVER_STREAM = {
  document: unknown
  clients: Map<string, JSONSYNC_SERVER_CLIENT_STATE>
  arrayidentitykeys?: JSONSYNC_ARRAY_KEYS
  topkeys?: string[]
}

export type JSONSYNC_CLIENT_STREAM = {
  document: unknown
  shadow: unknown
  cv: number
  sv: number
  arrayidentitykeys?: JSONSYNC_ARRAY_KEYS
}

export type JSONSYNC_SNAPSHOT = {
  streamid: string
  cv: number
  sv: number
  document: unknown
  arrayidentitykeys?: JSONSYNC_ARRAY_KEYS
}

export type JSONSYNC_PATCH = {
  streamid: string
  cv: number
  sv: number
  changes: Changeset
}

export type JSONSYNC_ANTI = {
  streamid: string
  cv: number
  sv: number
  changes: Changeset
}

export type JSONSYNC_ACCEPT_RESULT =
  | { kind: 'ok'; stream: JSONSYNC_SERVER_STREAM }
  | {
      kind: 'readonlyanti'
      stream: JSONSYNC_SERVER_STREAM
      anti: JSONSYNC_ANTI
    }
  | { kind: 'versionmismatch'; stream: JSONSYNC_SERVER_STREAM }
  | { kind: 'unknownclient'; stream: JSONSYNC_SERVER_STREAM }

export type JSONSYNC_CLIENT_APPLY_RESULT =
  | { kind: 'ok'; stream: JSONSYNC_CLIENT_STREAM }
  | { kind: 'versionmismatch'; stream: JSONSYNC_CLIENT_STREAM }

// --- helpers -----------------------------------------------------------

// strict apply: returns a fresh document with the changeset applied, throws on failure
function strictapply(document: unknown, changes: Changeset): unknown {
  const next = deepcopy(document)
  return applyChangeset(next as any, deepcopy(changes))
}

// fuzzy apply: apply each top-level change inside try/catch; skip failures.
// per the paper, the authoritative doc may be patched best-effort so concurrent
// edits from other clients don't abort the whole batch.
function fuzzyapply(document: unknown, changes: Changeset): unknown {
  let next = deepcopy(document)
  for (let i = 0; i < changes.length; ++i) {
    try {
      next = applyChangeset(next as any, deepcopy([changes[i]]))
    } catch {
      // skip bad op; last writer wins semantics
    }
  }
  return next
}

function diffdocs(
  previous: unknown,
  next: unknown,
  keys?: JSONSYNC_ARRAY_KEYS,
): Changeset {
  return diff(
    deepcopy(previous) as any,
    deepcopy(next) as any,
    ispresent(keys) ? { embeddedObjKeys: keys } : undefined,
  )
}

// shallow top-level key allowlist. returns a new plain object containing only
// the own enumerable keys listed in `topkeys` that are actually present on
// `doc`. if topkeys is undefined / empty or `doc` isn't a plain object, the
// input is returned unchanged so non-object streams (strings, arrays) still
// work end-to-end.
function projecttopkeys(doc: unknown, topkeys?: string[]): unknown {
  if (!isarray(topkeys) || topkeys.length === 0) {
    return doc
  }
  if (!ispresent(doc) || typeof doc !== 'object' || isarray(doc)) {
    return doc
  }
  const source = doc as Record<string, unknown>
  const projected: Record<string, unknown> = {}
  for (let i = 0; i < topkeys.length; ++i) {
    const key = topkeys[i]
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      projected[key] = source[key]
    }
  }
  return projected
}

// --- server side -------------------------------------------------------

export function jsonsynccreateserverstream(
  document: unknown,
  options?: JSONSYNC_STREAM_OPTIONS,
): JSONSYNC_SERVER_STREAM {
  const topkeys = options?.topkeys
  const projected = projecttopkeys(document, topkeys)
  return {
    document: deepcopy(projected),
    clients: new Map(),
    arrayidentitykeys: options?.arrayidentitykeys,
    topkeys,
  }
}

export function jsonsyncserverupdatedoc(
  stream: JSONSYNC_SERVER_STREAM,
  nextdoc: unknown,
): JSONSYNC_SERVER_STREAM {
  const projected = projecttopkeys(nextdoc, stream.topkeys)
  return {
    ...stream,
    document: deepcopy(projected),
  }
}

export function jsonsyncserveradmit(
  stream: JSONSYNC_SERVER_STREAM,
  player: string,
  writable: boolean,
): { stream: JSONSYNC_SERVER_STREAM; snapshot: JSONSYNC_SNAPSHOT } {
  const nextclients = new Map(stream.clients)
  nextclients.set(player, {
    shadow: deepcopy(stream.document),
    cv: 0,
    sv: 0,
    writable,
  })
  const nextstream: JSONSYNC_SERVER_STREAM = {
    ...stream,
    clients: nextclients,
  }
  const snapshot: JSONSYNC_SNAPSHOT = {
    streamid: '',
    cv: 0,
    sv: 0,
    document: deepcopy(stream.document),
    arrayidentitykeys: stream.arrayidentitykeys,
  }
  return { stream: nextstream, snapshot }
}

export function jsonsyncserverremove(
  stream: JSONSYNC_SERVER_STREAM,
  player: string,
): JSONSYNC_SERVER_STREAM {
  const nextclients = new Map(stream.clients)
  nextclients.delete(player)
  return { ...stream, clients: nextclients }
}

// server receives a client patch: validate sync tuple, enforce read-only, strict
// apply to that client's server-shadow, fuzzy-apply to the authoritative doc.
export function jsonsyncserveraccept(
  stream: JSONSYNC_SERVER_STREAM,
  player: string,
  patch: JSONSYNC_PATCH,
): JSONSYNC_ACCEPT_RESULT {
  const state = stream.clients.get(player)
  if (!ispresent(state)) {
    return { kind: 'unknownclient', stream }
  }
  if (patch.cv !== state.cv || patch.sv !== state.sv) {
    return { kind: 'versionmismatch', stream }
  }
  if (!isarray(patch.changes)) {
    return { kind: 'versionmismatch', stream }
  }
  // empty changes = "catch-up ping" (the v2 client response to a poke). no doc
  // or shadow mutation, no cv bump, and the read-only gate doesn't apply since
  // there are no writes being claimed.
  if (patch.changes.length === 0) {
    return { kind: 'ok', stream }
  }
  if (state.writable === false) {
    // read-only: do NOT mutate doc or shadow; reply with the same changeset as an
    // anti-patch. the client applies it via revertChangeset to undo its local edit.
    const anti: JSONSYNC_ANTI = {
      streamid: patch.streamid,
      cv: state.cv,
      sv: state.sv,
      changes: deepcopy(patch.changes),
    }
    return { kind: 'readonlyanti', stream, anti }
  }
  let newshadow: unknown
  try {
    newshadow = strictapply(state.shadow, patch.changes)
  } catch {
    return { kind: 'versionmismatch', stream }
  }
  const newdoc = fuzzyapply(stream.document, patch.changes)
  const nextstate: JSONSYNC_SERVER_CLIENT_STATE = {
    ...state,
    shadow: newshadow,
    cv: state.cv + 1,
  }
  const nextclients = new Map(stream.clients)
  nextclients.set(player, nextstate)
  return {
    kind: 'ok',
    stream: { ...stream, document: newdoc, clients: nextclients },
  }
}

// diff a single client's shadow against the authoritative doc and advance that
// client's sv. returns { stream, patch } with patch=undefined if no diff.
// used by the poke v2 flow so the server only does work for one client at a time.
export function jsonsyncserverbuildpatchfor(
  stream: JSONSYNC_SERVER_STREAM,
  streamid: string,
  player: string,
): {
  stream: JSONSYNC_SERVER_STREAM
  patch?: JSONSYNC_PATCH
} {
  const state = stream.clients.get(player)
  if (!ispresent(state)) {
    return { stream }
  }
  const changes = diffdocs(
    state.shadow,
    stream.document,
    stream.arrayidentitykeys,
  )
  if (changes.length === 0) {
    return { stream }
  }
  const patch: JSONSYNC_PATCH = {
    streamid,
    cv: state.cv,
    sv: state.sv,
    changes,
  }
  const nextclients = new Map(stream.clients)
  nextclients.set(player, {
    ...state,
    shadow: deepcopy(stream.document),
    sv: state.sv + 1,
  })
  return { stream: { ...stream, clients: nextclients }, patch }
}

// diff the authoritative doc against each client's shadow and advance their sv.
// returns per-player patches ready to emit. skips clients with empty diffs.
export function jsonsyncserverbuildpatches(
  stream: JSONSYNC_SERVER_STREAM,
  streamid: string,
): {
  stream: JSONSYNC_SERVER_STREAM
  patches: { player: string; patch: JSONSYNC_PATCH }[]
} {
  const patches: { player: string; patch: JSONSYNC_PATCH }[] = []
  const nextclients = new Map<string, JSONSYNC_SERVER_CLIENT_STATE>()
  stream.clients.forEach((state, player) => {
    const changes = diffdocs(
      state.shadow,
      stream.document,
      stream.arrayidentitykeys,
    )
    if (changes.length === 0) {
      nextclients.set(player, state)
      return
    }
    patches.push({
      player,
      patch: {
        streamid,
        cv: state.cv,
        sv: state.sv,
        changes,
      },
    })
    nextclients.set(player, {
      ...state,
      shadow: deepcopy(stream.document),
      sv: state.sv + 1,
    })
  })
  return { stream: { ...stream, clients: nextclients }, patches }
}

// --- client side -------------------------------------------------------

export function jsonsynccreateclientstream(): JSONSYNC_CLIENT_STREAM {
  return {
    document: undefined,
    shadow: undefined,
    cv: 0,
    sv: 0,
  }
}

export function jsonsyncclientapplysnapshot(
  _stream: JSONSYNC_CLIENT_STREAM,
  snapshot: JSONSYNC_SNAPSHOT,
): JSONSYNC_CLIENT_STREAM {
  return {
    document: deepcopy(snapshot.document),
    shadow: deepcopy(snapshot.document),
    cv: snapshot.cv,
    sv: snapshot.sv,
    arrayidentitykeys: snapshot.arrayidentitykeys,
  }
}

// strict-apply a server patch to the client's shadow and document.
// validates the [cv, sv] tuple matches; advances sv.
export function jsonsyncclientapplyserverpatch(
  stream: JSONSYNC_CLIENT_STREAM,
  patch: JSONSYNC_PATCH,
): JSONSYNC_CLIENT_APPLY_RESULT {
  if (!isnumber(patch.cv) || !isnumber(patch.sv) || !isarray(patch.changes)) {
    return { kind: 'versionmismatch', stream }
  }
  if (patch.cv !== stream.cv || patch.sv !== stream.sv) {
    return { kind: 'versionmismatch', stream }
  }
  let newshadow: unknown
  let newdoc: unknown
  try {
    newshadow = strictapply(stream.shadow, patch.changes)
    newdoc = strictapply(stream.document, patch.changes)
  } catch {
    return { kind: 'versionmismatch', stream }
  }
  return {
    kind: 'ok',
    stream: {
      ...stream,
      shadow: newshadow,
      document: newdoc,
      sv: stream.sv + 1,
    },
  }
}

// anti-patch: revert a rejected local edit. receiver applies revertChangeset
// to both shadow and document so local state matches what the server kept.
export function jsonsyncclientapplyanti(
  stream: JSONSYNC_CLIENT_STREAM,
  anti: JSONSYNC_ANTI,
): JSONSYNC_CLIENT_APPLY_RESULT {
  if (!isarray(anti.changes)) {
    return { kind: 'versionmismatch', stream }
  }
  let newshadow: unknown
  let newdoc: unknown
  try {
    newshadow = revertChangeset(
      deepcopy(stream.shadow) as any,
      deepcopy(anti.changes),
    )
    newdoc = revertChangeset(
      deepcopy(stream.document) as any,
      deepcopy(anti.changes),
    )
  } catch {
    return { kind: 'versionmismatch', stream }
  }
  // anti-patches rewind our cv because the proposed edit never happened
  return {
    kind: 'ok',
    stream: {
      ...stream,
      shadow: newshadow,
      document: newdoc,
      cv: Math.max(0, stream.cv - 1),
    },
  }
}

// diff local state against local shadow, produce a client patch, advance cv,
// replace shadow with the new local document.
export function jsonsyncclientlocalupdate(
  stream: JSONSYNC_CLIENT_STREAM,
  nextdoc: unknown,
  streamid: string,
): { stream: JSONSYNC_CLIENT_STREAM; patch: JSONSYNC_PATCH } {
  const changes = diffdocs(stream.shadow, nextdoc, stream.arrayidentitykeys)
  const patch: JSONSYNC_PATCH = {
    streamid,
    cv: stream.cv,
    sv: stream.sv,
    changes,
  }
  const nextstream: JSONSYNC_CLIENT_STREAM = {
    ...stream,
    document: deepcopy(nextdoc),
    shadow: deepcopy(nextdoc),
    cv: stream.cv + (changes.length > 0 ? 1 : 0),
  }
  return { stream: nextstream, patch }
}

// utility for device layer: safe stream key
export function jsonsyncstreamkey(streamid: string): string {
  return isstring(streamid) ? streamid : ''
}

// true when the client has local edits that haven't been shipped yet (doc
// differs from shadow). used by the v2 poke handler to avoid sending an empty
// catch-up ping that would collide with the normal edit flow.
export function jsonsyncclienthaspending(
  stream: JSONSYNC_CLIENT_STREAM,
): boolean {
  const changes = diffdocs(
    stream.shadow,
    stream.document,
    stream.arrayidentitykeys,
  )
  return changes.length > 0
}

// return every player in the stream except the excluded one (the originator of
// a local edit). used by the device layer to decide who to poke after an accept.
export function jsonsyncserverlistpeers(
  stream: JSONSYNC_SERVER_STREAM,
  excludeplayer?: string,
): string[] {
  const peers: string[] = []
  stream.clients.forEach((_state, player) => {
    if (player !== excludeplayer) {
      peers.push(player)
    }
  })
  return peers
}
