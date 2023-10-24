import * as jsonpatch from 'fast-json-patch'
import { createGuid } from 'zss/mapping/guid'
import { DEVICE, createMessage } from 'zss/network/device'
import { STATE } from 'zss/system/chip'

import { createPublisher, createSubscribe } from './pubsub'

export type JSON_SYNC_SERVER = {
  device: DEVICE
  id: () => string
  sync: (state: STATE) => void
}

export function createJsonSyncServer() {
  const id = createGuid()
  const local: STATE = {
    state: {},
  }
  const remote: STATE = {
    state: {},
  }

  const publisher = createPublisher('jss', (message) => {
    switch (message.target) {
      case 'reset':
        publisher.device.send(
          createMessage(`${message.origin}:reset`, remote.state),
        )
        break
      default:
        break
    }
  })

  const server: JSON_SYNC_SERVER = {
    device: publisher.device,
    id() {
      return id
    },
    sync() {
      const newRemote = jsonpatch.deepClone(local.state)
      const patch = jsonpatch.compare(remote.state, newRemote)
      publisher.publish('sync', patch)
      remote.state = newRemote
    },
  }

  return server
}

export type JSON_SYNC_CLIENT = {
  device: DEVICE
  id: () => string
  destroy: () => void
}

export type JSON_SYNC_CLIENT_CHANGE_FUNC = (state: STATE) => void

export function createJsonSyncClient(
  serverTarget: string,
  onChange: JSON_SYNC_CLIENT_CHANGE_FUNC,
) {
  const id = createGuid()
  let state: STATE = {}
  let needsReset = false

  const sub = createSubscribe('jsc', (message) => {
    switch (message.target) {
      case 'sync':
        if (!needsReset) {
          try {
            jsonpatch.applyPatch(state, jsonpatch.deepClone(message.data), true)
            onChange(state)
          } catch (err) {
            if (err instanceof jsonpatch.JsonPatchError) {
              // we are out of sync and need to request a refresh
              needsReset = true
              sub.device.send(createMessage(`${serverTarget}:reset`))
            }
          }
        }
        break
      case 'reset':
        state = jsonpatch.deepClone(message.data)
        onChange(state)
        break
      default:
        break
    }
  })

  sub.subscribe(serverTarget)

  const client: JSON_SYNC_CLIENT = {
    device: sub.device,
    id() {
      return id
    },
    destroy() {
      sub.unsubscribe()
    },
  }

  return client
}
