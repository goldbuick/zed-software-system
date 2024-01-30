import * as decoding from 'lib0/decoding'
import * as encoding from 'lib0/encoding'
import * as syncprotocol from 'y-protocols/sync'
import * as Y from 'yjs'
import { DEVICE } from 'zss/system/device'

export type MAYBE_MAP = Y.Map<any> | undefined
export type MAYBE_TEXT = Y.Text | undefined
export type MAYBE_ARRAY = Y.Array<any> | undefined
export type MAYBE_NUMBER = number | undefined
export type MAYBE_STRING = string | undefined
export type UNOBSERVE_FUNC = () => void

const docs: Record<string, Y.Doc | undefined> = {}
const origin: Record<string, boolean | undefined> = {}

const tracking: Record<string, number | undefined> = {}
const lastactive: Record<string, number | undefined> = {}

let shareddevice: DEVICE | undefined

export function setdevice(device: DEVICE) {
  shareddevice = device
}

function getDoc(guid: string) {
  let doc = docs[guid]
  if (doc) {
    return doc
  }

  docs[guid] = doc = new Y.Doc({ guid })

  function handleupdates(update: Uint8Array) {
    const updateEncoder = encoding.createEncoder()
    syncprotocol.writeUpdate(updateEncoder, update)
    shareddevice?.emit('shared:sync', sharedmessage(guid, updateEncoder))
  }

  // encode updates to send to other shared docs
  doc.on('update', handleupdates)

  // cleanup
  doc.on('destroy', () => {
    doc?.off('update', handleupdates)
  })

  return doc
}

function getValues(guid: string) {
  return getDoc(guid).getMap()
}

export function sharedmessage(guid: string, encoder: encoding.Encoder) {
  const message = encoding.toUint8Array(encoder)
  // origin, doc guid, content
  return [shareddevice?.id() ?? '', guid, message]
}

function getValueFromMap<T>(values: Y.Map<any>, key: string): T | undefined {
  const value = values.get(key)
  if (value?.toJSON) {
    return value.toJSON()
  }
  return value
}

function setValueOnMap<T>(values: Y.Map<any>, key: string, value: T) {
  if (typeof value === 'string') {
    values.set(key, new Y.Text(value))
  } else {
    values.set(key, value)
  }
}

function joinShared(guid: string) {
  tracking[guid] = (tracking[guid] ?? 0) + 1
  if (tracking[guid] === 1) {
    delete lastactive[guid]
    shareddevice?.emit('shared:join', guid)
  }
}

function leaveShared(guid: string) {
  const current = tracking[guid] ?? 0
  if (current <= 1) {
    delete tracking[guid]
    delete lastactive[guid]
  } else {
    tracking[guid] = current - 1
  }
}

// object change handlers

export function serveSharedValue<T>(guid: string, key: string, value: T) {
  // mark this guid as origin
  origin[guid] = true
  // determine if we need to init value
  const values = getValues(guid)
  const current = values.get(key)
  if (current === undefined && value !== undefined) {
    setValueOnMap(values, key, value)
  }
}

export function updateSharedValue<T extends MAYBE_NUMBER | MAYBE_STRING>(
  guid: string,
  key: string,
  value: T,
) {
  const values = getValues(guid)
  const current = getValueFromMap<T>(values, key)
  if (current === undefined || value !== current) {
    setValueOnMap(values, key, value)
  }
}

export function observeSharedValue<T extends MAYBE_NUMBER | MAYBE_STRING>(
  guid: string,
  key: string,
  handler: (value: T | undefined) => void,
): UNOBSERVE_FUNC {
  const values = getValues(guid)

  function invoke() {
    handler(getValueFromMap<T>(values, key))
  }

  function observehandler(event: Y.YMapEvent<any>) {
    if (event.keysChanged.has(key)) {
      invoke()
    }
  }

  invoke()
  values.observe(observehandler)
  return () => {
    values.unobserve(observehandler)
  }
}

export function observeSharedType<
  T extends MAYBE_MAP | MAYBE_TEXT | MAYBE_ARRAY,
>(
  guid: string,
  key: string,
  handler: (value: T | undefined) => void,
): UNOBSERVE_FUNC {
  const values = getValues(guid)
  let type = values.get(key) as T | undefined

  function observehandler() {
    handler(type)
  }

  function valueshandler(event: Y.YMapEvent<any>) {
    if (event.keysChanged.has(key) && type === undefined) {
      checktype()
    }
    if (type) {
      values.unobserve(valueshandler)
    }
  }

  function checktype() {
    type = values.get(key) as T | undefined
    if (type) {
      type.observeDeep(observehandler)
      observehandler()
    } else {
      values.observe(valueshandler)
    }
  }

  checktype()
  return () => {
    if (type) {
      type.unobserveDeep(observehandler)
    } else {
      values.unobserve(valueshandler)
    }
  }
}

export function joinSharedValue<T extends MAYBE_NUMBER | MAYBE_STRING>(
  guid: string,
  key: string,
  handler: (value: T | undefined) => void,
): UNOBSERVE_FUNC {
  joinShared(guid)
  const done = observeSharedValue(guid, key, handler)
  return () => {
    done()
    leaveShared(guid)
  }
}

export function joinSharedType<T extends MAYBE_MAP | MAYBE_TEXT | MAYBE_ARRAY>(
  guid: string,
  key: string,
  handler: (value: T | undefined) => void,
): UNOBSERVE_FUNC {
  joinShared(guid)
  const done = observeSharedType(guid, key, handler)
  return () => {
    done()
    leaveShared(guid)
  }
}
