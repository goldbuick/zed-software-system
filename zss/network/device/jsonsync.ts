import * as jsonpatch from 'fast-json-patch'

import { createGuid } from '/zss/mapping/guid'

import { createDevice } from '../device'

export type JSON_SYNC_SERVER = {
  id: () => string
  state: () => Record<string, any>
  diff: () => jsonpatch.Operation[]
}

export function createJsonSyncServer() {
  const id = createGuid()
  const local: Record<string, any> = {
    state: {},
  }
  const remote: Record<string, any> = {}

  const server: JSON_SYNC_SERVER = {
    id() {
      return id
    },
    state() {
      return local.state
    },
    diff() {
      return jsonpatch.compare(remote, local)
    },
  }

  const device = createDevice('jss', [], (message, args) => {
    switch (message) {
      case 'reset':
        device.send(`jsc:${args}:reset`, remote)
        break
      default:
        break
    }
  })

  return server
}

export type JSON_SYNC_CLIENT = {
  id: () => string
  state: () => Record<string, any>
  read: (diff: jsonpatch.Operation[]) => boolean
  reset: (newState: Record<string, any>) => void
}

export function createJsonSyncClient(serverId: string) {
  const id = createGuid()
  let state: Record<string, any> = {}
  let needsReset = false

  const client: JSON_SYNC_CLIENT = {
    id() {
      return id
    },
    state() {
      return state
    },
    read(diff) {
      if (needsReset) {
        // we drop diffs while we wait for reset
        return true
      }

      try {
        jsonpatch.applyPatch(state, jsonpatch.deepClone(diff), true)
      } catch (err) {
        if (err instanceof jsonpatch.JsonPatchError) {
          // we are out of sync and need to request a refresh
          return false
        }
      }

      return true
    },
    reset(newState) {
      state = newState
      needsReset = false
    },
  }

  const device = createDevice('jsc', [], (message, args) => {
    switch (message) {
      case 'read': {
        if (!client.read(args)) {
          device.send(`jss:${serverId}:reset`, id)
        }
        break
      }
      default:
        break
    }
  })

  return client
}

/*

jsonsync is a simple server -> client proto
clients are read only and this is used to keep a display model in sync

*/
