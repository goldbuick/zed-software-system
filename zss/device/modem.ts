import { syncedStore, getYjsDoc, SyncedText } from '@syncedstore/core'
import { useSyncedStore } from '@syncedstore/react'
import * as decoding from 'lib0/decoding'
import * as encoding from 'lib0/encoding'
import { useEffect } from 'react'
import * as syncprotocol from 'y-protocols/sync'
import { createdevice } from 'zss/device'
import { MAYBE, ispresent } from 'zss/mapping/types'

export enum MODEM_SHARED_TYPE {
  NUMBER,
  STRING,
}

type MODEM_SHARED_VALUE =
  | {
      type: MODEM_SHARED_TYPE.NUMBER
      value: number
    }
  | {
      type: MODEM_SHARED_TYPE.STRING
      value: SyncedText
    }

type SHARED_TYPE_MAP = {
  [MODEM_SHARED_TYPE.NUMBER]: number
  [MODEM_SHARED_TYPE.STRING]: SyncedText
}

type SHARED_VALUES = Record<string, MODEM_SHARED_VALUE>

const store = syncedStore({ shared: {} } as { shared: SHARED_VALUES })

export function useModem() {
  return useSyncedStore(store)
}

// react ui code uses this to wait for shared value to
// populate before continuing
export function useWaitFor(callback: () => MAYBE<() => void>, key: string) {
  const modem = useModem()
  const maybevalue = modem.shared[key]
  useEffect(() => {
    const value = modem.shared[key]
    if (ispresent(value)) {
      return callback()
    }
    // skip
    return undefined
  }, [callback, key, modem, maybevalue])
}

// non react code uses this to setup values
export function modemwriteinit<T extends MODEM_SHARED_TYPE>(
  key: string,
  type: T,
  value: SHARED_TYPE_MAP[T],
) {
  const maybevalue = store.shared[key]
  if (!ispresent(maybevalue)) {
    // @ts-expect-error ugh
    store.shared[key] = {
      type,
      value,
    }
  }
}

function modemmessage(encoder: encoding.Encoder) {
  const message = encoding.toUint8Array(encoder)
  return [message]
}

let joined = false
const doc = getYjsDoc(store)

const modem = createdevice('modem', ['second'], (message) => {
  switch (message.target) {
    case 'second':
      if (!joined) {
        // send join message
        modem.emit('modem:join')
      }
      break
    case 'join':
      if (message.sender !== modem.id()) {
        // signal to stop join message
        modem.reply(message, 'joinack')

        // send sync step 1
        const syncEncoder1 = encoding.createEncoder()
        syncprotocol.writeSyncStep1(syncEncoder1, doc)
        modem.reply(message, 'sync', modemmessage(syncEncoder1))

        // send sync step 2
        const syncEncoder2 = encoding.createEncoder()
        syncprotocol.writeSyncStep2(syncEncoder2, doc)
        modem.reply(message, 'sync', modemmessage(syncEncoder2))
      }
      break
    case 'joinack':
      joined = true
      break
    case 'sync': {
      const [content] = message.data
      if (message.sender !== modem.id()) {
        const decoder = decoding.createDecoder(content)
        const syncEncoder = encoding.createEncoder()
        const syncMessageType = syncprotocol.readSyncMessage(
          decoder,
          syncEncoder,
          doc,
          modem,
        )
        if (syncMessageType === syncprotocol.messageYjsSyncStep1) {
          modem.emit('modem:sync', modemmessage(syncEncoder))
        }
      }
      break
    }
  }
})

function handleupdates(update: Uint8Array) {
  const updateencoder = encoding.createEncoder()
  syncprotocol.writeUpdate(updateencoder, update)
  modem.emit('modem:sync', modemmessage(updateencoder))
}

// encode updates to send to other shared docs
doc.on('update', handleupdates)

// cleanup
doc.on('destroy', () => {
  doc?.off('update', handleupdates)
})
