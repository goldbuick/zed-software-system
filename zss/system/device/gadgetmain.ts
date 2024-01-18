import { JsonPatchError, applyPatch } from 'fast-json-patch'
import { proxy, useSnapshot } from 'valtio'
import { GADGET_STATE } from 'zss/gadget/data/types'
import { createDevice } from 'zss/network/device'

let needsReset = false

type SYNC_STATE = {
  state: GADGET_STATE
}

const syncstate = proxy<SYNC_STATE>({
  state: {
    player: '',
    layers: [],
    layout: [],
    layoutreset: false,
    layoutfocus: '',
  },
})

const gadgetmain = createDevice('gadgetmain', ['login'], (message) => {
  switch (message.target) {
    case 'login':
      if (
        message.player &&
        message.target === 'login' &&
        syncstate.state.player === ''
      ) {
        syncstate.state.player = message.player
      }
      break
    case 'reset':
      if (message.player === syncstate.state.player) {
        needsReset = false
        syncstate.state = message.data
      }
      break
    case 'patch':
      if (message.player === syncstate.state.player && !needsReset) {
        try {
          applyPatch(syncstate.state, message.data, true)
        } catch (err) {
          if (err instanceof JsonPatchError) {
            // we are out of sync and need to request a refresh
            needsReset = true
            gadgetmain.reply(
              message,
              'desync',
              undefined,
              syncstate.state.player,
            )
          }
        }
      }
      break
  }
})

export function useGadgetState(): GADGET_STATE {
  return useSnapshot(syncstate.state) as GADGET_STATE
}
