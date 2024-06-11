import { syncedStore, getYjsDoc, SyncedText } from '@syncedstore/core'
import { useSyncedStore } from '@syncedstore/react'
import * as decoding from 'lib0/decoding'
import * as encoding from 'lib0/encoding'
import * as syncprotocol from 'y-protocols/sync'
import { createdevice } from 'zss/device'
import { MAYBE, ispresent } from 'zss/mapping/types'

export enum MODEM_SHARED_TYPE {
  NUMBER,
  STRING,
}

export type MODEM_SHARED_VALUE =
  | {
      key: string
      type: MODEM_SHARED_TYPE.NUMBER
      value: number
    }
  | {
      key: string
      type: MODEM_SHARED_TYPE.STRING
      value: SyncedText
    }

type SHARED_TYPE_MAP = {
  [MODEM_SHARED_TYPE.NUMBER]: number
  [MODEM_SHARED_TYPE.STRING]: SyncedText
}

const store = syncedStore({ shared: [] } as { shared: MODEM_SHARED_VALUE[] })

function findvalue(
  values: MODEM_SHARED_VALUE[],
  key: string,
  type: MODEM_SHARED_TYPE,
): MAYBE<MODEM_SHARED_VALUE> {
  return values.find((item) => item.key === key && item.type === type)
}

export function useModem() {
  const modem = useSyncedStore(store)
  return modem
}

// react ui code uses this to wait for shared value to
// populate before continuing
function useWaitFor(
  key: string,
  type: MODEM_SHARED_TYPE,
): MODEM_SHARED_VALUE | undefined {
  const modem = useModem()
  const maybevalue = findvalue(modem.shared, key, type)
  return ispresent(maybevalue) ? maybevalue : undefined
}

export function useWaitForNumber(key: string) {
  const result = useWaitFor(key, MODEM_SHARED_TYPE.NUMBER)
  return result
}

export function useWaitForString(key: string) {
  const result = useWaitFor(key, MODEM_SHARED_TYPE.STRING)
  return result
}

// non react code uses this to setup values
function modemwriteinit<T extends MODEM_SHARED_TYPE>(
  key: string,
  type: T,
  value: SHARED_TYPE_MAP[T],
) {
  const maybevalue = findvalue(store.shared, key, type)
  if (ispresent(maybevalue)) {
    return
  }

  // @ts-expect-error ugh
  store.shared.push({ key, type, value })
}

export function modemwritenumber(key: string, value: number) {
  modemwriteinit(key, MODEM_SHARED_TYPE.NUMBER, value)
}

export function modemwritestring(key: string, value: string) {
  const strvalue = new SyncedText(value)
  modemwriteinit(key, MODEM_SHARED_TYPE.STRING, strvalue)
}

function modemmessage(encoder: encoding.Encoder) {
  return encoding.toUint8Array(encoder)
}

let joined = false
const doc = getYjsDoc(store)

const modem = createdevice('modem', ['second'], (message) => {
  switch (message.target) {
    case 'second':
      // send join message
      if (!joined && message.data % 2 === 0) {
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
      if (ispresent(message.data) && message.sender !== modem.id()) {
        const decoder = decoding.createDecoder(message.data)
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
