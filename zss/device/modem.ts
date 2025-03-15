import * as decoding from 'lib0/decoding'
import * as encoding from 'lib0/encoding'
import { useEffect, useState } from 'react'
import * as syncprotocol from 'y-protocols/sync'
import * as Y from 'yjs'
import { createdevice } from 'zss/device'
import { UNOBSERVE_FUNC } from 'zss/gadget/data/types'
import { MAYBE, isnumber, ispresent } from 'zss/mapping/types'

import { api_error } from './api'

export { Y }

export enum MODEM_SHARED_TYPE {
  NUMBER,
  STRING,
}

type SHARED_TYPE_MAP = {
  [MODEM_SHARED_TYPE.NUMBER]: number
  [MODEM_SHARED_TYPE.STRING]: Y.Text
}

let joined = false
const SYNC_DOC = new Y.Doc()

// tape editor uses this to wait for shared value to populate
// scroll hyperlinks use this to wait for shared value to populate
function useWaitForValue<T extends MODEM_SHARED_TYPE>(
  key: string,
): MAYBE<SHARED_TYPE_MAP[T]> {
  const SYNC_MAP = SYNC_DOC.getMap()

  const [, settoggle] = useState(0)
  useEffect(() => {
    function handlechange() {
      settoggle((state) => 1 - state)
    }
    SYNC_MAP.observe(handlechange)
    return () => {
      SYNC_MAP.unobserve(handlechange)
    }
  }, [SYNC_MAP, settoggle])

  if (SYNC_MAP.has(key)) {
    return SYNC_MAP.get(key) as MAYBE<SHARED_TYPE_MAP[T]>
  }

  return undefined
}

export function useWaitForValueNumber(key: string) {
  const value = useWaitForValue<MODEM_SHARED_TYPE.NUMBER>(key)
  if (!isnumber(value)) {
    return undefined
  }
  return value
}

export function useWaitForValueString(key: string) {
  const value = useWaitForValue<MODEM_SHARED_TYPE.STRING>(key)
  if (!ispresent(value) || !(value instanceof Y.Text)) {
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
  const SYNC_MAP = SYNC_DOC.getMap()
  if (SYNC_MAP.has(key)) {
    return
  }
  // create new value
  switch (type) {
    case MODEM_SHARED_TYPE.NUMBER:
    case MODEM_SHARED_TYPE.STRING:
      SYNC_MAP.set(key, value)
      break
  }
}

export function modemwriteinitnumber(key: string, value: number) {
  modemwriteinit(key, MODEM_SHARED_TYPE.NUMBER, value)
}

export function modemwriteinitstring(key: string, value: string) {
  const strvalue = new Y.Text(value)
  modemwriteinit(key, MODEM_SHARED_TYPE.STRING, strvalue)
}

// for scrolls
export function modemwritevaluenumber(key: string, value: number) {
  const SYNC_MAP = SYNC_DOC.getMap()
  SYNC_MAP.set(key, value)
}

export function modemwritevaluestring(key: string, value: string) {
  const SYNC_MAP = SYNC_DOC.getMap()
  const strvalue = new Y.Text(value)
  SYNC_MAP.set(key, strvalue)
}

function modemobservevalue(
  key: string,
  callback: (value: any) => void,
): UNOBSERVE_FUNC {
  const SYNC_MAP = SYNC_DOC.getMap<number | Y.Text>()

  function handlechange(edits: Y.YEvent<any>[]) {
    const maybevalue = SYNC_MAP.get(key)
    for (let i = 0; i < edits.length; ++i) {
      if (edits[i].target === SYNC_MAP || edits[i].target === maybevalue) {
        callback(maybevalue)
      }
    }
  }

  if (SYNC_MAP.has(key)) {
    callback(SYNC_MAP.get(key))
  }

  SYNC_MAP.observeDeep(handlechange)
  return () => {
    SYNC_MAP.observeDeep(handlechange)
  }
}

export function modemobservevaluenumber(
  key: string,
  callback: (value: number) => void,
): UNOBSERVE_FUNC {
  return modemobservevalue(key, (value: number) => {
    if (isnumber(value)) {
      callback(value)
    }
  })
}

export function modemobservevaluestring(
  key: string,
  callback: (value: string) => void,
): UNOBSERVE_FUNC {
  return modemobservevalue(key, (value: Y.Text) => {
    if (value instanceof Y.Text) {
      callback(value.toJSON())
    }
  })
}

function modemmessage(encoder: encoding.Encoder) {
  return encoding.toUint8Array(encoder)
}

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
        syncprotocol.writeSyncStep1(syncEncoder1, SYNC_DOC)
        modem.reply(message, 'sync', modemmessage(syncEncoder1))

        // send sync step 2
        const syncEncoder2 = encoding.createEncoder()
        syncprotocol.writeSyncStep2(syncEncoder2, SYNC_DOC)
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
            SYNC_DOC,
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
SYNC_DOC.on('update', handleupdates)

// cleanup
SYNC_DOC.on('destroy', () => {
  SYNC_DOC.off('update', handleupdates)
})
