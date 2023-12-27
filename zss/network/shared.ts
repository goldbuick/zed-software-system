import * as decoding from 'lib0/decoding'
import * as encoding from 'lib0/encoding'
import { useEffect, useState } from 'react'
import * as syncprotocol from 'y-protocols/sync'
import * as Y from 'yjs'

import { createDevice } from './device'

export type MAYBE_MAP = Y.Map<any> | undefined
export type MAYBE_TEXT = Y.Text | undefined
export type MAYBE_ARRAY = Y.Array<any> | undefined
export type MAYBE_NUMBER = number | undefined
export type MAYBE_STRING = string | undefined

const docs: Record<string, Y.Doc> = {}

const shareddevice = createDevice('shared', [], (message) => {
  switch (message.target) {
    case 'join': {
      const guid = message.data
      const doc = docs[guid]
      if (doc) {
        // send sync step 1
        const syncEncoder = encoding.createEncoder()
        syncprotocol.writeSyncStep1(syncEncoder, doc)
        sendMessage('sync', guid, syncEncoder)

        // send sync step 2
        const syncEncoder2 = encoding.createEncoder()
        syncprotocol.writeSyncStep2(syncEncoder2, doc)
        sendMessage('sync', guid, syncEncoder2)
      }
      break
    }
    case 'sync': {
      const [origin, guid, content] = message.data
      const doc = docs[guid]
      if (origin !== shareddevice.id() && doc !== undefined) {
        const decoder = decoding.createDecoder(content)
        const syncEncoder = encoding.createEncoder()
        const syncMessageType = syncprotocol.readSyncMessage(
          decoder,
          syncEncoder,
          doc,
          shareddevice,
        )
        if (syncMessageType === syncprotocol.messageYjsSyncStep1) {
          sendMessage('sync', guid, syncEncoder)
        }
      }
      break
    }
  }
})

function getValues(guid: string, client?: boolean) {
  if (!docs[guid]) {
    docs[guid] = new Y.Doc({ guid })

    function handleupdates(update: Uint8Array) {
      const updateEncoder = encoding.createEncoder()
      syncprotocol.writeUpdate(updateEncoder, update)
      sendMessage('sync', guid, updateEncoder)
    }

    docs[guid].on('update', handleupdates)
    docs[guid].on('destroy', () => {
      docs[guid].off('update', handleupdates)
    })

    // send join message
    if (client) {
      joinShared(guid)
    }
  }
  return docs[guid].getMap()
}

function sendMessage(target: string, guid: string, encoder: encoding.Encoder) {
  const message = encoding.toUint8Array(encoder)
  // origin, doc guid, content
  const data = [shareddevice.id(), guid, message]
  shareddevice.emit(`shared:${target}`, data)
}

function getValueFromMap<T>(values: Y.Map<any>, key: string): T | undefined {
  const value = values.get(key)
  if (value?.toJSON) {
    return value.toJSON()
  }
  return value
}

function setValueOnMap<T>(values: Y.Map<any>, key: string, value: T) {
  console.info('setValueOnMap', key, value, typeof value)
  if (typeof value === 'string') {
    // how do we handle this ?
    values.set(key, new Y.Text(value))
  } else {
    values.set(key, value)
  }
}

export type UNOBSERVE_FUNC = () => void

export function joinShared(guid: string) {
  shareddevice.emit('shared:join', guid)
}

export function updateShared<T>(guid: string, key: string, value: T) {
  const values = getValues(guid)
  const current = getValueFromMap<T>(values, key)
  console.info('updateShared', guid, key, current, '=>', value)
  if (current !== value) {
    setValueOnMap(values, key, value)
  }
}

export function observeShared<T>(
  guid: string,
  key: string,
  handler: (value: T | undefined) => void,
): UNOBSERVE_FUNC {
  const values = getValues(guid)

  function observehandler(events: Y.YEvent<any>[]) {
    const list = events as Y.YMapEvent<any>[]
    for (let i = 0; i < list.length; ++i) {
      console.info(list[i])
      if (list[i].keysChanged.has(key)) {
        handler(getValueFromMap<T>(values, key))
      }
    }
  }

  values.observeDeep(observehandler)
  return () => {
    values.unobserveDeep(observehandler)
  }
}

export function useSharedValue<T>(
  guid: string,
  key: string,
): [T | undefined, (v: Exclude<T, undefined>) => void] {
  const values = getValues(guid, true)
  const [value, setvalue] = useState<T | undefined>(
    getValueFromMap<T>(values, key),
  )

  useEffect(() => {
    function observehandler(events: Y.YEvent<any>[]) {
      const list = events as Y.YMapEvent<any>[]
      for (let i = 0; i < list.length; ++i) {
        if (list[i].keysChanged.has(key)) {
          const v = getValueFromMap<T>(values, key)
          setvalue(v)
        }
      }
    }

    values.observeDeep(observehandler)
    return () => {
      values.unobserveDeep(observehandler)
    }
  }, [])

  function updatevalue(newvalue: Exclude<T, undefined>) {
    setValueOnMap(values, key, newvalue)
  }

  return [value, updatevalue]
}

export function useSharedType<T>(guid: string, key: string): [T] {
  const values = getValues(guid, true)
  const type = values.get(key) as T
  const [t, toggle] = useState(0)

  useEffect(() => {
    function observehandler() {
      toggle(1 - t)
    }

    // @ts-expect-error will figure out how to type this later
    type?.observeDeep(observehandler)
    return () => {
      // @ts-expect-error will figure out how to type this later
      type?.unobserveDeep(observehandler)
    }
  }, [])

  return [values.get(key) as T]
}
