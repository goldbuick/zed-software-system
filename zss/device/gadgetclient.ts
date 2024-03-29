import { JsonPatchError, applyPatch } from 'fast-json-patch'
import { proxy, useSnapshot } from 'valtio'
import { createdevice } from 'zss/device'
import { GADGET_STATE } from 'zss/gadget/data/types'

let desync = false

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

const gadgetclientdevice = createdevice(
  'gadgetclient',
  ['ready', 'second'],
  (message) => {
    switch (message.target) {
      case 'ready':
        if (message.player && syncstate.state.player === '') {
          syncstate.state.player = message.player
          gadgetclientdevice.emit('vm:login', undefined, syncstate.state.player)
        }
        break
      case 'second':
        if (syncstate.state.player) {
          gadgetclientdevice.emit('vm:doot', undefined, syncstate.state.player)
        }
        break
      case 'reset':
        if (message.player === syncstate.state.player) {
          desync = false
          syncstate.state = message.data
        }
        break
      case 'patch':
        if (message.player === syncstate.state.player && !desync) {
          try {
            applyPatch(syncstate.state, message.data, true)
          } catch (err) {
            if (err instanceof JsonPatchError) {
              // we are out of sync and need to request a refresh
              desync = true
              gadgetclientdevice.reply(
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
  },
)

export function useGadgetState(): GADGET_STATE {
  return useSnapshot(syncstate.state) as GADGET_STATE
}
