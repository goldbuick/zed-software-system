import { JsonPatchError, applyPatch } from 'fast-json-patch'
import { proxy, useSnapshot } from 'valtio'
import { createDevice } from 'zss/network/device'
import { STATE } from 'zss/system/chip'
import { GADGET_STATE } from 'zss/system/firmware/gadget'

import { player } from './player'

let needsReset = false

type SYNC_STATE = {
  state: STATE
}

const syncstate = proxy<SYNC_STATE>({
  state: {},
})

const gadgetclient = createDevice('gadgetclient', [], (message) => {
  // filter by player
  if (message.player !== player) {
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
          applyPatch(syncstate.state, message.data, true)
        } catch (err) {
          if (err instanceof JsonPatchError) {
            // we are out of sync and need to request a refresh
            needsReset = true
            gadgetclient.emit('platform:desync', gadgetclient.id(), player)
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