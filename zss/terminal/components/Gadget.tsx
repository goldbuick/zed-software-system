import * as jsonpatch from 'fast-json-patch'
import React from 'react'
import { proxy, useSnapshot } from 'valtio'
import { Layout } from 'zss/gadget/components/layout'
import { createDevice } from 'zss/network/device'
import { hub } from 'zss/network/hub'
import { STATE } from 'zss/system/chip'

import { playerId } from '../main/playerId'

let needsReset = false

type SYNC_STATE = {
  state: STATE
}

const syncstate = proxy<SYNC_STATE>({
  state: {},
})

const device = createDevice('gadgetclient', [], (message) => {
  // filter by playerId
  if (message.playerId !== playerId) {
    return
  }

  switch (message.target) {
    case 'reset':
      needsReset = false
      syncstate.state = message.data
      break

    case 'patch': {
      if (!needsReset) {
        try {
          jsonpatch.applyPatch(syncstate.state, message.data, true)
        } catch (err) {
          if (err instanceof jsonpatch.JsonPatchError) {
            // we are out of sync and need to request a refresh
            needsReset = true
            hub.emit(
              'gadgetserver:desync',
              device.name(),
              device.id(),
              playerId,
            )
          }
        }
      }
      break
    }
    default:
      console.error(message)
      break
  }
})

export function Gadget() {
  const model = useSnapshot(syncstate.state)
  return <Layout panels={model.layout} />
}
