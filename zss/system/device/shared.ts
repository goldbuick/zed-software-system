import * as decoding from 'lib0/decoding'
import * as encoding from 'lib0/encoding'
import * as syncprotocol from 'y-protocols/sync'
import * as Y from 'yjs'
import { createDevice } from 'zss/network/device'

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

export function getValues(guid: string, client?: boolean) {
  let doc = docs[guid]
  if (!doc) {
    docs[guid] = doc = new Y.Doc({ guid })

    function handleupdates(update: Uint8Array) {
      const updateEncoder = encoding.createEncoder()
      syncprotocol.writeUpdate(updateEncoder, update)
      sendMessage('sync', guid, updateEncoder)
    }

    // encode updates to send to other shared docs
    doc.on('update', handleupdates)

    // cleanup
    doc.on('destroy', () => {
      doc.off('update', handleupdates)
    })

    // send join message
    if (client) {
      joinShared(guid)
    }
  }

  return doc.getMap()
}

function sendMessage(target: string, guid: string, encoder: encoding.Encoder) {
  const message = encoding.toUint8Array(encoder)
  // origin, doc guid, content
  const data = [shareddevice.id(), guid, message]
  shareddevice.emit(`shared:${target}`, data)
}

export function getValueFromMap<T>(
  values: Y.Map<any>,
  key: string,
): T | undefined {
  const value = values.get(key)
  if (value?.toJSON) {
    return value.toJSON()
  }
  return value
}

export function setValueOnMap<T>(values: Y.Map<any>, key: string, value: T) {
  // console.info('setValueOnMap', key, value, typeof value)
  if (typeof value === 'string') {
    values.set(key, new Y.Text(value))
  } else {
    values.set(key, value)
  }
}

export type UNOBSERVE_FUNC = () => void

export function joinShared(guid: string) {
  shareddevice.emit('shared:join', guid)
}

// object change handlers

export function initSharedValue<T>(guid: string, key: string, value: T) {
  const values = getValues(guid)
  const current = values.get(key)
  if (current === undefined && value !== undefined) {
    // console.info('initSharedValue', { key, value })
    setValueOnMap(values, key, value)
  }
}

export function checkSharedValue<T extends MAYBE_NUMBER | MAYBE_STRING>(
  guid: string,
  key: string,
  value: T,
) {
  const values = getValues(guid)
  const current = getValueFromMap<T>(values, key)
  if (current === undefined || value !== current) {
    // console.info('checkSharedValue', { key, value })
    setValueOnMap(values, key, value)
  }
}

export function observeSharedValue<T extends MAYBE_NUMBER | MAYBE_STRING>(
  guid: string,
  key: string,
  handler: (value: T | undefined) => void,
): UNOBSERVE_FUNC {
  const values = getValues(guid)

  function observehandler(event: Y.YMapEvent<any>) {
    if (event.keysChanged.has(key)) {
      handler(getValueFromMap<T>(values, key))
    }
  }

  values.observe(observehandler)
  return () => {
    values.unobserve(observehandler)
  }
}

export function observeSharedType<T extends MAYBE_TEXT | MAYBE_MAP>(
  guid: string,
  key: string,
  handler: (value: T | undefined) => void,
): UNOBSERVE_FUNC {
  const values = getValues(guid, true)
  const type = values.get(key) as T | undefined

  function observehandler() {
    handler(type)
  }

  type?.observeDeep(observehandler)
  return () => {
    type?.unobserveDeep(observehandler)
  }
}
