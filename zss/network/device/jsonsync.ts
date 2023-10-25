import * as jsonpatch from 'fast-json-patch'
import { DEVICE, createMessage } from 'zss/network/device'
import { STATE } from 'zss/system/chip'

export type JSON_SYNC_SERVER = {
  device: DEVICE
  sync: (state: STATE) => void
}

export function createJsonSyncServer(name: string) {
  const remote: STATE = {
    state: {},
  }

  const publisher = createPublisher(
    name,
    (origin) => {
      const message = createMessage(`${origin}:reset`, remote.state)
      publisher.device.send(message)
    },
    (message) => {
      switch (message.target) {
        case 'reset':
          publisher.device.send(
            createMessage(`${message.origin}:reset`, remote.state),
          )
          break
        default:
          console.error(message)
          break
      }
    },
  )

  const server: JSON_SYNC_SERVER = {
    device: publisher.device,
    sync(next: STATE) {
      const newRemote = jsonpatch.deepClone(next)
      const patch = jsonpatch.compare(remote.state, newRemote)
      if (patch.length) {
        console.info('sync', next, patch)
        publisher.publish('sync', patch)
        remote.state = newRemote
      }
    },
  }

  return server
}

export type JSON_SYNC_CLIENT = {
  device: DEVICE
  subscribe: (target: string) => void
  destroy: () => void
}

export type JSON_SYNC_CLIENT_CHANGE_FUNC = (state: STATE) => void

export function createJsonSyncClient(
  name: string,
  onChange: JSON_SYNC_CLIENT_CHANGE_FUNC,
) {
  let state: STATE = {}
  let needsReset = false

  const sub = createSubscribe(name, (message) => {
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
              sub.device.send(createMessage(`${message.origin}:reset`))
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

  const client: JSON_SYNC_CLIENT = {
    device: sub.device,
    subscribe(target) {
      sub.subscribe(target)
    },
    destroy() {
      sub.unsubscribe()
    },
  }

  return client
}
