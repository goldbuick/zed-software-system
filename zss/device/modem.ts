import { useEffect, useState } from 'react'
import { arr2hex, hex2arr } from 'uint8-util'
import { Model, Patch } from 'json-joy/lib/json-crdt'
import { Log } from 'json-joy/lib/json-crdt/log/Log'
import { createdevice } from 'zss/device'
import { UNOBSERVE_FUNC } from 'zss/gadget/data/types'
import { MAYBE, isnumber, ispresent } from 'zss/mapping/types'
import type { StrApi } from 'json-joy/lib/json-crdt/model/api/nodes'

/** Timestamp id for matching patches to a specific string node (undo scope) */
export interface NodeId {
  sid: number
  time: number
}

/**
 * Shared text handle - Y.Text-compatible API for json-joy StrApi.
 * Used by editor and panels for collaborative string editing.
 * nodeId enables undo/redo filtering (only undo edits to this string).
 */
export interface SharedTextHandle {
  toJSON(): string
  insert(index: number, text: string): void
  delete(index: number, length: number): void
  get length(): number
  /** For undo: match patches that affect this string */
  readonly nodeId: NodeId
}

function createSharedTextHandle(strApi: StrApi): SharedTextHandle {
  const nodeId = (strApi as { node?: { id: NodeId } }).node?.id ?? { sid: -1, time: -1 }
  return {
    get nodeId() {
      return nodeId
    },
    toJSON() {
      const view = strApi.view()
      return typeof view === 'string' ? view : ''
    },
    insert(index: number, text: string) {
      strApi.ins(index, text)
    },
    delete(index: number, length: number) {
      strApi.del(index, length)
    },
    get length() {
      return strApi.length()
    },
  }
}


export enum MODEM_SHARED_TYPE {
  NUMBER,
  STRING,
}

type SHARED_TYPE_MAP = {
  [MODEM_SHARED_TYPE.NUMBER]: number
  [MODEM_SHARED_TYPE.STRING]: SharedTextHandle
}

let joined = false
const SYNC_MODEL = Model.create()

// ensure root is empty object for key-value map
if (SYNC_MODEL.view() === undefined || typeof SYNC_MODEL.view() !== 'object') {
  SYNC_MODEL.api.set({})
}

const ROOT_OBJ = () => SYNC_MODEL.api.obj()

/** CRDT log for undo - captures patches, can produce revert patches */
let SYNC_LOG: Log

function initSyncLog() {
  SYNC_LOG?.destroy?.()
  SYNC_LOG = Log.from(SYNC_MODEL)
}

initSyncLog()

/** Get the modem's CRDT log for undo/redo (Log.undo) */
export function getModemLog(): Log {
  return SYNC_LOG
}

/** Apply a patch to the shared model and sync to peers. Used for undo/redo. */
export function modemApplyAndSyncPatch(patch: Patch) {
  SYNC_MODEL.applyPatch(patch)
  modem.emit('', 'modem:sync', arr2hex(patch.toBinary()))
}

function sameId(a: NodeId, b: { sid?: number; time?: number }): boolean {
  return a?.sid === b?.sid && a?.time === b?.time
}

/** True if the patch affects the given string node (for undo scope) */
export function patchAffectsNode(patch: Patch, nodeId: NodeId): boolean {
  for (const op of patch.ops) {
    const obj = (op as { obj?: { sid?: number; time?: number } }).obj
    if (obj && sameId(nodeId, obj)) return true
  }
  return false
}

// tape editor uses this to wait for shared value to populate
// scroll hyperlinks use this to wait for shared value to populate
function useWaitForValue<T extends MODEM_SHARED_TYPE>(
  key: string,
  type: T,
): MAYBE<SHARED_TYPE_MAP[T]> {
  const [, settoggle] = useState(0)
  useEffect(() => {
    const unsub = SYNC_MODEL.api.subscribe(() => settoggle((s) => 1 - s))
    return () => unsub()
  }, [])

  const obj = ROOT_OBJ()
  if (!obj.has(key)) {
    return undefined
  }
  const childApi = obj.get(key)
  if (!childApi) return undefined

  try {
    if (type === MODEM_SHARED_TYPE.NUMBER) {
      const view = childApi.view()
      return (typeof view === 'number' ? view : undefined) as MAYBE<SHARED_TYPE_MAP[T]>
    }
    if (type === MODEM_SHARED_TYPE.STRING) {
      const valApi = childApi as { get?: () => { asStr?: () => StrApi } }
      const inner = valApi.get?.() ?? childApi
      const strApi = (inner as { asStr?: () => StrApi }).asStr?.() ?? inner
      if (strApi && typeof (strApi as StrApi).ins === 'function') {
        return createSharedTextHandle(strApi as StrApi) as MAYBE<SHARED_TYPE_MAP[T]>
      }
    }
  } catch {
    // key exists but wrong type
  }
  return undefined
}

export function useWaitForValueNumber(key: string) {
  const value = useWaitForValue<MODEM_SHARED_TYPE.NUMBER>(key, MODEM_SHARED_TYPE.NUMBER)
  if (!isnumber(value)) {
    return undefined
  }
  return value
}

export function useWaitForValueString(key: string) {
  const value = useWaitForValue<MODEM_SHARED_TYPE.STRING>(key, MODEM_SHARED_TYPE.STRING)
  if (!ispresent(value) || typeof value?.toJSON !== 'function') {
    return undefined
  }
  return value
}

// non react code uses this to setup values
function modemwriteinit<T extends MODEM_SHARED_TYPE>(
  key: string,
  type: T,
  value: SHARED_TYPE_MAP[T],
) {
  const obj = ROOT_OBJ()
  if (obj.has(key)) return
  const toSet =
    type === MODEM_SHARED_TYPE.STRING
      ? (value as SharedTextHandle).toJSON()
      : (value as number)
  obj.set({ [key]: toSet })
}

export function modemwriteinitnumber(key: string, value: number) {
  modemwriteinit(key, MODEM_SHARED_TYPE.NUMBER, value)
}

export function modemwriteinitstring(key: string, value: string) {
  const obj = ROOT_OBJ()
  if (obj.has(key)) return
  obj.set({ [key]: value })
}

// for scrolls
export function modemwritevaluenumber(key: string, value: number) {
  ROOT_OBJ().set({ [key]: value })
}

export function modemwritevaluestring(key: string, value: string) {
  ROOT_OBJ().set({ [key]: value })
}

function getValueForKey(key: string): unknown {
  const obj = ROOT_OBJ()
  if (!obj.has(key)) return undefined
  const childApi = obj.get(key)
  if (!childApi) return undefined
  try {
    const valApi = childApi as { get?: () => { view?: () => unknown; asStr?: () => StrApi } }
    const inner = valApi.get?.() ?? childApi
    const view = (inner as { view?: () => unknown })?.view?.()
    if (typeof view === 'string') {
      const strApi = (inner as { asStr?: () => StrApi }).asStr?.()
      return strApi ? createSharedTextHandle(strApi) : view
    }
    return view
  } catch {
    return undefined
  }
}

function modemobservevalue(
  key: string,
  callback: (value: unknown) => void,
): UNOBSERVE_FUNC {
  const unsub = SYNC_MODEL.api.subscribe(() => {
    if (ROOT_OBJ().has(key)) {
      callback(getValueForKey(key))
    }
  })
  if (ROOT_OBJ().has(key)) {
    callback(getValueForKey(key))
  }
  return () => unsub()
}

export function modemobservevaluenumber(
  key: string,
  callback: (value: number) => void,
): UNOBSERVE_FUNC {
  return modemobservevalue(key, (value: unknown) => {
    if (isnumber(value)) {
      callback(value)
    }
  })
}

export function modemobservevaluestring(
  key: string,
  callback: (value: string) => void,
): UNOBSERVE_FUNC {
  return modemobservevalue(key, (value: unknown) => {
    if (value && typeof (value as SharedTextHandle).toJSON === 'function') {
      callback((value as SharedTextHandle).toJSON())
    }
  })
}

const modem = createdevice('modem', ['second'], (message) => {
  if (!modem.session(message)) {
    return
  }
  switch (message.target) {
    case 'second':
      if (!joined && message.data % 2 === 0) {
        modem.emit(message.player, 'modem:join')
      }
      break
    case 'join':
      if (message.sender !== modem.id()) {
        modem.reply(
          message,
          'joinack',
          arr2hex(SYNC_MODEL.toBinary()),
        )
      }
      break
    case 'joinack':
      if (message.sender !== modem.id()) {
        joined = true
        try {
          const data = hex2arr(message.data)
          const incoming = Model.fromBinary(data)
          SYNC_MODEL.reset(incoming)
          initSyncLog()
        } catch (e) {
          console.error('modem joinack decode', e)
        }
      }
      break
    case 'sync': {
      if (message.sender !== modem.id() && ispresent(message.data)) {
        try {
          const patch = Patch.fromBinary(hex2arr(message.data))
          SYNC_MODEL.applyPatch(patch)
        } catch (e) {
          console.error('modem sync decode', e)
        }
      }
      break
    }
  }
})

function handleflush(patch: Patch) {
  modem.emit('', 'modem:sync', arr2hex(patch.toBinary()))
}

SYNC_MODEL.api.autoFlush(true)
SYNC_MODEL.api.onFlush.listen(handleflush)
