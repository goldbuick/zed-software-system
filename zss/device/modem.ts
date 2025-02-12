import {
  syncedStore,
  getYjsDoc,
  SyncedText,
  observeDeep,
} from '@syncedstore/core'
import { useSyncedStore } from '@syncedstore/react'
import * as decoding from 'lib0/decoding'
import * as encoding from 'lib0/encoding'
import * as syncprotocol from 'y-protocols/sync'
import { createdevice } from 'zss/device'
import { UNOBSERVE_FUNC } from 'zss/gadget/data/types'
import { MAYBE, ispresent } from 'zss/mapping/types'

import { api_error } from './api'

export enum MODEM_SHARED_TYPE {
  NUMBER,
  STRING,
}

export type MODEM_SHARED_NUMBER = {
  key: string
  type: MODEM_SHARED_TYPE.NUMBER
  value: number
}

export type MODEM_SHARED_STRING = {
  key: string
  type: MODEM_SHARED_TYPE.STRING
  value: SyncedText
}

export type MODEM_SHARED_VALUE = MODEM_SHARED_NUMBER | MODEM_SHARED_STRING

type MODEM_TYPE_MAP = {
  [MODEM_SHARED_TYPE.NUMBER]: MODEM_SHARED_NUMBER
  [MODEM_SHARED_TYPE.STRING]: MODEM_SHARED_STRING
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

// tape editor uses this to wait for shared value to populate
// scroll hyperlinks use this to wait for shared value to populate

function useWaitForValue<T extends MODEM_SHARED_TYPE>(
  key: string,
  type: T,
): MAYBE<MODEM_TYPE_MAP[T]> {
  const modem = useModem()
  const maybevalue = findvalue(modem.shared, key, type)
  return ispresent(maybevalue)
    ? (maybevalue as MAYBE<MODEM_TYPE_MAP[T]>)
    : undefined
}

export function useWaitForValueNumber(key: string) {
  return useWaitForValue(key, MODEM_SHARED_TYPE.NUMBER)
}

export function useWaitForValueString(key: string) {
  return useWaitForValue(key, MODEM_SHARED_TYPE.STRING)
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

export function modemwriteinitnumber(key: string, value: number) {
  console.info('modemwriteinitnumber', key, value)
  modemwriteinit(key, MODEM_SHARED_TYPE.NUMBER, value)
}

export function modemwriteinitstring(key: string, value: string) {
  console.info('modemwriteinitstring', key, value)
  const strvalue = new SyncedText(value)
  modemwriteinit(key, MODEM_SHARED_TYPE.STRING, strvalue)
}

// for scrolls
export function modemwritevaluenumber(key: string, value: number) {
  const maybevalue = findvalue(store.shared, key, MODEM_SHARED_TYPE.NUMBER)
  if (ispresent(maybevalue)) {
    maybevalue.value = value
    return
  }
  store.shared.push({ key, type: MODEM_SHARED_TYPE.NUMBER, value })
}

export function modemwritevaluestring(key: string, value: string) {
  const strvalue = new SyncedText(value)
  const maybevalue = findvalue(store.shared, key, MODEM_SHARED_TYPE.STRING)
  if (ispresent(maybevalue)) {
    maybevalue.value = strvalue
    return
  }
  store.shared.push({ key, type: MODEM_SHARED_TYPE.STRING, value: strvalue })
}

function modemobservevalue(
  key: string,
  type: MODEM_SHARED_TYPE,
  callback: (value: any) => void,
): UNOBSERVE_FUNC {
  let observedone: MAYBE<UNOBSERVE_FUNC>

  function checkvalue() {
    const maybevalue = findvalue(store.shared, key, type)
    if (ispresent(maybevalue)) {
      checkdone()
      observedone = observeDeep(maybevalue, () => callback(maybevalue.value))
    }
  }

  const checkdone = observeDeep(store.shared, checkvalue)
  checkvalue()

  return () => observedone?.()
}

export function modemobservevaluenumber(
  key: string,
  callback: (value: number) => void,
): UNOBSERVE_FUNC {
  return modemobservevalue(key, MODEM_SHARED_TYPE.NUMBER, callback)
}

export function modemobservevaluestring(
  key: string,
  callback: (value: string) => void,
): UNOBSERVE_FUNC {
  return modemobservevalue(key, MODEM_SHARED_TYPE.STRING, (value: SyncedText) =>
    callback(value.toJSON()),
  )
}

// non react code uses this to listen to value changes
// getYjsValue

function modemmessage(encoder: encoding.Encoder) {
  return encoding.toUint8Array(encoder)
}

let joined = false
const doc = getYjsDoc(store)

const modem = createdevice('modem', ['second'], (message) => {
  if (!modem.session(message)) {
    return
  }
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
      if (message.sender !== modem.id()) {
        joined = true
      }
      break
    case 'sync': {
      if (message.sender !== modem.id() && ispresent(message.data)) {
        try {
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
        } catch (err: any) {
          api_error(modem, 'sync', err.message)
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
