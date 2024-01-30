import * as decoding from 'lib0/decoding'
import * as encoding from 'lib0/encoding'
import * as syncprotocol from 'y-protocols/sync'
import * as Y from 'yjs'
import { createdevice } from 'zss/system/device'
import { sharedmessage, setdevice } from 'zss/system/shared'

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

const shareddevice = createdevice('shared', ['clock'], (message) => {
  switch (message.target) {
    case 'clock':
      // what guids do we care about?
      Object.keys(tracking).forEach((guid) => {
        // what is the state of our connection to origin ?
        const lasttime = lastactive[guid]
        if (lasttime === undefined) {
          // waiting to join
          shareddevice.emit('shared:join', guid)
        } else if (lasttime < 10) {
          // 10 second ish timeout
          lastactive[guid] = lasttime + 1
        } else {
          // need to re-join
          delete lastactive[guid]
        }
      })

      // what guids are we origin for?
      Object.keys(origin).forEach((guid) => {
        shareddevice.emit('shared:active', guid)
      })
      break

    case 'join': {
      const guid = message.data
      const doc = docs[guid]
      if (doc && origin[guid]) {
        // signal to stop join message
        shareddevice.reply(message, 'joinack', guid)

        // send sync step 1
        const syncEncoder1 = encoding.createEncoder()
        syncprotocol.writeSyncStep1(syncEncoder1, doc)
        shareddevice.reply(message, 'sync', sharedmessage(guid, syncEncoder1))

        // send sync step 2
        const syncEncoder2 = encoding.createEncoder()
        syncprotocol.writeSyncStep2(syncEncoder2, doc)
        shareddevice.reply(message, 'sync', sharedmessage(guid, syncEncoder2))
      }
      break
    }

    case 'joinack': {
      const guid = message.data
      const doc = docs[guid]
      if (doc && tracking[guid]) {
        lastactive[guid] = 0
      }
      break
    }

    case 'active': {
      const guid = message.data
      const doc = docs[guid]
      if (doc && tracking[guid]) {
        lastactive[guid] = 0
      }
      break
    }

    case 'sync': {
      const [origin, guid, content] = message.data
      const doc = docs[guid]
      if (doc && origin !== shareddevice.id()) {
        const decoder = decoding.createDecoder(content)
        const syncEncoder = encoding.createEncoder()
        const syncMessageType = syncprotocol.readSyncMessage(
          decoder,
          syncEncoder,
          doc,
          shareddevice,
        )
        if (syncMessageType === syncprotocol.messageYjsSyncStep1) {
          const data = sharedmessage(guid, syncEncoder)
          shareddevice.emit('shared:sync', data)
        }
      }
      break
    }
  }
})

// so doc changes get sync'd
setdevice(shareddevice)
