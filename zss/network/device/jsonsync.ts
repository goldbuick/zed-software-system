import * as jsonpatch from 'fast-json-patch'

import { createGuid } from '/zss/mapping/guid'

import { createDevice, createMessage } from '../device'

import { createPublisher, createSubscribe } from './pubsub'

export type JSON_SYNC_SERVER = {
  id: () => string
  state: () => Record<string, any>
  sync: () => void
}

export function createJsonSyncServer() {
  const id = createGuid()
  const local: Record<string, any> = {
    state: {},
  }
  const remote: Record<string, any> = {
    state: {},
  }

  const server: JSON_SYNC_SERVER = {
    id() {
      return id
    },
    state() {
      return local.state
    },
    sync() {
      const newRemote = jsonpatch.deepClone(local.state)
      const patch = jsonpatch.compare(remote.state, newRemote)
      device.publish('sync', patch)
      remote.state = newRemote
    },
  }

  const device = createPublisher('jss', (message) => {
    switch (message.target) {
      case 'reset':
        device.send(createMessage(`${message.origin}:reset`, remote.state))
        break
      default:
        break
    }
  })

  return server
}

export type JSON_SYNC_CLIENT = {
  id: () => string
  destroy: () => void
}

export type JSON_SYNC_CLIENT_CHANGE_FUNC = (state: Record<string, any>) => void

export function createJsonSyncClient(
  serverTarget: string,
  onChange: JSON_SYNC_CLIENT_CHANGE_FUNC,
) {
  const id = createGuid()
  let state: Record<string, any> = {}
  let needsReset = false

  const device = createSubscribe('jsc', (message) => {
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
              device.send(createMessage(`${serverTarget}:reset`))
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

  device.subscribe(serverTarget)

  const client: JSON_SYNC_CLIENT = {
    id() {
      return id
    },
    destroy() {
      device.unsubscribe()
    },
  }

  return client
}
