import { useEffect, useState } from 'react'
import { arr2hex, hex2arr } from 'uint8-util'
import * as awarenessProtocol from 'y-protocols/awareness'
import * as Y from 'yjs'
import { createdevice } from 'zss/device'
import { UNOBSERVE_FUNC } from 'zss/gadget/data/types'
import { MAYBE, isnumber, ispresent } from 'zss/mapping/types'

/** Presence information for remote users editing codepages */
export type PresenceState = {
  /** Client/player ID */
  clientId: string
  /** User display name */
  name: string
  /** User color (hex) */
  color: string
  /** Cursor position in text */
  cursor: number
  /** Selection start (if selecting) */
  select?: number
  /** Codepage key being edited */
  codepageKey: string
  /** Last update timestamp */
  lastSeen: number
}

/** Identifies a shared text for undo scope (Yjs: the map key) */
export type NodeId = {
  key: string
}

/**
 * Shared text handle - Y.Text-based API.
 * Used by editor and panels for collaborative string editing.
 * nodeId.key enables undo/redo per text.
 */
export type SharedTextHandle = {
  toJSON(): string
  insert(index: number, text: string): void
  delete(index: number, length: number): void
  get length(): number
  /** For undo: which text this handle refers to */
  readonly nodeId: NodeId
}

const SYNC_DOC_GUID = 'zss_modem_sync'
const SYNC_DOC = new Y.Doc({ guid: SYNC_DOC_GUID })
const ROOT = SYNC_DOC.getMap('root')
const AWARENESS = new awarenessProtocol.Awareness(SYNC_DOC)

/** One UndoManager per text key; created on first use */
const undomanagers = new Map<string, { um: Y.UndoManager; text: Y.Text }>()
/** Cursor position to store in stack-item-added (set by editor before edit) */
const cursorbeforeedit = new Map<string, number>()
/** Callbacks to restore cursor after undo/redo (registered by editor) */
const cursorrestorecallbacks = new Map<string, (cursor: number) => void>()

const LOCAL_ORIGIN = Symbol('local')

function getorcreatetext(key: string): Y.Text {
  const raw = ROOT.get(key)
  if (!raw || !(raw instanceof Y.Text)) {
    const text = new Y.Text()
    ROOT.set(key, text)
    return text
  }
  return raw
}

function getorcreateundomanager(key: string): {
  um: Y.UndoManager
  text: Y.Text
} {
  let entry = undomanagers.get(key)
  if (!entry) {
    const text = getorcreatetext(key)
    const um = new Y.UndoManager(text, {
      captureTimeout: 0,
      trackedOrigins: new Set([LOCAL_ORIGIN]),
    })
    um.on(
      'stack-item-added',
      (event: { stackItem: { meta: Map<unknown, unknown> } }) => {
        const cursor = cursorbeforeedit.get(key) ?? 0
        try {
          const rel = Y.createRelativePositionFromTypeIndex(text, cursor)
          event.stackItem.meta.set('cursor-location', rel)
        } catch {
          event.stackItem.meta.set('cursor-location', null)
        }
      },
    )
    um.on(
      'stack-item-popped',
      (event: { stackItem: { meta: Map<unknown, unknown> }; type: string }) => {
        const cb = cursorrestorecallbacks.get(key)
        if (!cb) {
          return
        }
        const rel = event.stackItem.meta.get('cursor-location')
        if (rel != null && typeof rel === 'object') {
          try {
            const pos = Y.createAbsolutePositionFromRelativePosition(
              rel as Y.RelativePosition,
              SYNC_DOC,
            )
            if (pos?.type === text) {
              const index = pos.index
              cb(index)
              return
            }
          } catch {
            // fallback
          }
        }
        const len = text.length
        cb(len > 0 ? len : 0)
      },
    )
    entry = { um, text }
    undomanagers.set(key, entry)
  }
  return entry
}

function createSharedTextHandle(key: string, text: Y.Text): SharedTextHandle {
  const nodeId: NodeId = { key }
  return {
    get nodeId() {
      return nodeId
    },
    toJSON() {
      // Y.Text has custom toString returning document content
      return (text as { toString(): string }).toString()
    },
    insert(index: number, str: string) {
      SYNC_DOC.transact(() => {
        text.insert(index, str)
      }, LOCAL_ORIGIN)
    },
    delete(index: number, length: number) {
      SYNC_DOC.transact(() => {
        text.delete(index, length)
      }, LOCAL_ORIGIN)
    },
    get length() {
      return text.length
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

/** Set before local edit (insert/delete); used so only local edits are tracked for undo. */
let nextPatchIsLocal = false
export function markNextPatchAsLocal(): void {
  nextPatchIsLocal = true
}

/** Consume the local flag; returns true if the next transaction is from a local edit. */
export function consumeLocalPatchFlag(): boolean {
  const was = nextPatchIsLocal
  nextPatchIsLocal = false
  return was
}

/** Call before a local edit so we can store cursor for undo/redo. */
export function setCursorBeforeEdit(key: string, cursor: number): void {
  cursorbeforeedit.set(key, cursor)
}

/** Get the UndoManager for a shared text by key. */
export function getUndoManager(key: string): Y.UndoManager | undefined {
  return getorcreateundomanager(key).um
}

/** Test-only: get SharedTextHandle for a key if it exists and is text. */
export function getSharedTextHandleForTest(
  key: string,
): SharedTextHandle | undefined {
  const val = ROOT.get(key)
  if (val instanceof Y.Text) {
    return createSharedTextHandle(key, val)
  }
  return undefined
}

/** Test-only: reset a text key to empty and clear its UndoManager so tests start clean. */
export function resetKeyForTest(key: string): void {
  undomanagers.delete(key)
  const text = new Y.Text()
  ROOT.set(key, text)
}

/** Register a callback to restore cursor after undo/redo for the given key. Returns unregister. */
export function registerCursorRestore(
  key: string,
  restore: (cursor: number) => void,
): () => void {
  cursorrestorecallbacks.set(key, restore)
  return () => {
    cursorrestorecallbacks.delete(key)
  }
}

// ---------------------------------------------------------------------------
// Value access and subscription
// ---------------------------------------------------------------------------

function getValueForKey(key: string): unknown {
  const val = ROOT.get(key)
  if (val === undefined) {
    return undefined
  }
  if (typeof val === 'number') {
    return val
  }
  if (val instanceof Y.Text) {
    getorcreateundomanager(key)
    return createSharedTextHandle(key, val)
  }
  return undefined
}

function useWaitForValue<T extends MODEM_SHARED_TYPE>(
  key: string,
  type: T,
): MAYBE<SHARED_TYPE_MAP[T]> {
  const [, settoggle] = useState(0)
  useEffect(() => {
    const handler = () => settoggle((s) => 1 - s)
    SYNC_DOC.on('update', handler)
    return () => SYNC_DOC.off('update', handler)
  }, [])

  try {
    if (!ROOT.has(key)) {
      return undefined
    }
    const val = getValueForKey(key)
    if (val === undefined) {
      return undefined
    }

    if (type === MODEM_SHARED_TYPE.NUMBER) {
      return (typeof val === 'number' ? val : undefined) as MAYBE<
        SHARED_TYPE_MAP[T]
      >
    }
    if (type === MODEM_SHARED_TYPE.STRING) {
      return (
        val && typeof (val as SharedTextHandle).toJSON === 'function'
          ? val
          : undefined
      ) as MAYBE<SHARED_TYPE_MAP[T]>
    }
  } catch {
    // mid-mutation
  }
  return undefined
}

export function useWaitForValueNumber(key: string) {
  const value = useWaitForValue<MODEM_SHARED_TYPE.NUMBER>(
    key,
    MODEM_SHARED_TYPE.NUMBER,
  )
  if (!isnumber(value)) {
    return undefined
  }
  return value
}

export function useWaitForValueString(key: string) {
  const value = useWaitForValue<MODEM_SHARED_TYPE.STRING>(
    key,
    MODEM_SHARED_TYPE.STRING,
  )
  if (!ispresent(value) || typeof value?.toJSON !== 'function') {
    return undefined
  }
  return value
}

export function modemwriteinitnumber(key: string, value: number) {
  if (ROOT.has(key)) {
    return
  }
  SYNC_DOC.transact(() => {
    ROOT.set(key, value)
  }, LOCAL_ORIGIN)
}

export function modemwriteinitstring(key: string, value: string) {
  if (ROOT.has(key)) {
    return
  }
  SYNC_DOC.transact(() => {
    const text = new Y.Text(value)
    ROOT.set(key, text)
  }, LOCAL_ORIGIN)
}

export function modemwritevaluenumber(key: string, value: number) {
  SYNC_DOC.transact(() => {
    ROOT.set(key, value)
  }, LOCAL_ORIGIN)
}

export function modemwritevaluestring(key: string, value: string) {
  if (!ROOT.has(key)) {
    SYNC_DOC.transact(() => {
      const text = new Y.Text(value)
      ROOT.set(key, text)
    }, LOCAL_ORIGIN)
    return
  }
  const existing = ROOT.get(key)
  if (existing instanceof Y.Text) {
    SYNC_DOC.transact(() => {
      existing.delete(0, existing.length)
      existing.insert(0, value)
    }, LOCAL_ORIGIN)
  }
}

/** Read Y.Text string on the current JS realm (main thread); worker doc is separate. */
export function modemreadtextsync(key: string): string {
  const existing = ROOT.get(key)
  if (existing instanceof Y.Text) {
    return existing.toString()
  }
  return ''
}

function modemobservevalue(
  key: string,
  callback: (value: unknown) => void,
): UNOBSERVE_FUNC {
  const handler = () => {
    const value = getValueForKey(key)
    if (value !== undefined) {
      callback(value)
    }
  }
  SYNC_DOC.on('update', handler)
  handler()
  return () => SYNC_DOC.off('update', handler)
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

// ---------------------------------------------------------------------------
// Presence (Awareness)
// ---------------------------------------------------------------------------

function awarenessstatetopresence(
  clientIdNum: number,
  state: Record<string, unknown> | null,
): PresenceState | null {
  if (!state || typeof state !== 'object') {
    return null
  }
  const clientId = state.clientId as string | undefined
  const codepageKey = state.codepageKey as string | undefined
  if (clientId == null || codepageKey == null) {
    return null
  }
  return {
    clientId,
    name: (state.name as string) ?? `User ${String(clientIdNum).slice(0, 6)}`,
    color: (state.color as string) ?? '#3b82f6',
    cursor: (state.cursor as number) ?? 0,
    select: state.select as number | undefined,
    codepageKey,
    lastSeen: Date.now(),
  }
}

/** Get all presence states for a specific codepage */
export function getpresenceforcodepage(codepageKey: string): PresenceState[] {
  const result: PresenceState[] = []
  const states = AWARENESS.getStates()
  states.forEach((state: Record<string, unknown> | null, _clientId: number) => {
    const p = awarenessstatetopresence(_clientId, state)
    if (p?.codepageKey === codepageKey) {
      result.push(p)
    }
  })
  return result
}

/** Broadcast presence information to all peers (updates local Awareness state). */
export function modembroadcastpresence(
  clientId: string,
  codepageKey: string,
  cursor: number,
  select?: number,
  name?: string,
  color?: string,
) {
  AWARENESS.setLocalStateField('clientId', clientId)
  AWARENESS.setLocalStateField('codepageKey', codepageKey)
  AWARENESS.setLocalStateField('cursor', cursor)
  AWARENESS.setLocalStateField('select', select ?? null)
  AWARENESS.setLocalStateField('name', name ?? `User ${clientId.slice(0, 6)}`)
  AWARENESS.setLocalStateField('color', color ?? '#3b82f6')
}

/** Hook to observe presence for a codepage */
export function usePresence(codepageKey: string | undefined): PresenceState[] {
  const [presence, setPresence] = useState<PresenceState[]>([])

  useEffect(() => {
    if (!codepageKey) {
      setPresence([])
      return
    }
    const update = () => setPresence(getpresenceforcodepage(codepageKey))
    update()
    AWARENESS.on('change', update)
    return () => AWARENESS.off('change', update)
  }, [codepageKey])

  return presence
}

// ---------------------------------------------------------------------------
// Modem device and sync
// ---------------------------------------------------------------------------

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
          arr2hex(Y.encodeStateAsUpdate(SYNC_DOC)),
        )
        const myclientids = Array.from(AWARENESS.getStates().keys())
        if (myclientids.length > 0) {
          modem.emit(
            message.sender,
            'modem:awareness',
            arr2hex(
              awarenessProtocol.encodeAwarenessUpdate(AWARENESS, myclientids),
            ),
          )
        }
      }
      break
    case 'joinack':
      if (message.sender !== modem.id()) {
        joined = true
        try {
          const data = hex2arr(message.data)
          Y.applyUpdate(SYNC_DOC, data)
          undomanagers.clear()
        } catch (e) {
          console.error('modem joinack decode', e)
        }
      }
      break
    case 'sync': {
      if (message.sender !== modem.id() && ispresent(message.data)) {
        try {
          Y.applyUpdate(SYNC_DOC, hex2arr(message.data))
        } catch (e) {
          console.error('modem sync decode', e)
        }
      }
      break
    }
    case 'modem:awareness': {
      if (message.sender !== modem.id() && ispresent(message.data)) {
        try {
          awarenessProtocol.applyAwarenessUpdate(
            AWARENESS,
            hex2arr(message.data),
            null,
          )
        } catch (e) {
          console.error('modem awareness decode', e)
        }
      }
      break
    }
  }
})

SYNC_DOC.on('update', (update: Uint8Array, origin: unknown) => {
  if (origin === LOCAL_ORIGIN) {
    modem.emit('', 'modem:sync', arr2hex(update))
  }
})

AWARENESS.on(
  'update',
  ({
    added,
    updated,
    removed,
  }: {
    added: number[]
    updated: number[]
    removed: number[]
  }) => {
    const changed = added.concat(updated).concat(removed)
    if (changed.length > 0) {
      modem.emit(
        '',
        'modem:awareness',
        arr2hex(awarenessProtocol.encodeAwarenessUpdate(AWARENESS, changed)),
      )
    }
  },
)

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    awarenessProtocol.removeAwarenessStates(
      AWARENESS,
      [SYNC_DOC.clientID],
      'beforeunload',
    )
  })
}

/**
 * Teardown for test environments. Destroys the shared Y.Doc and Awareness so
 * Jest workers can exit without open handles. Call in afterAll() in tests that
 * import this module. Only safe to call when the process is about to exit.
 */
export function destroyModemForTest(): void {
  const doc = SYNC_DOC as Y.Doc & { isDestroyed?: boolean }
  if (!doc.isDestroyed) {
    SYNC_DOC.destroy()
  }
}
