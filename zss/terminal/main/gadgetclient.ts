import * as jsonpatch from 'fast-json-patch'
import { proxy, useSnapshot } from 'valtio'
import { createDevice } from 'zss/network/device'
import { hub } from 'zss/network/hub'
import { STATE } from 'zss/system/chip'
import { GADGET_STATE } from 'zss/system/firmware/gadget'

import { playerId } from '../main/player'

let needsReset = false

type SYNC_STATE = {
  state: STATE
}

const syncstate = proxy<SYNC_STATE>({
  state: {},
})

const gadgetclient = createDevice('gadgetclient', [], (message) => {
  // filter by playerId
  if (message.player !== playerId) {
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
              'platform:desync',
              gadgetclient.name(),
              gadgetclient.id(),
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

export function useGadgetState(): GADGET_STATE {
  return useSnapshot(syncstate.state) as GADGET_STATE
}
