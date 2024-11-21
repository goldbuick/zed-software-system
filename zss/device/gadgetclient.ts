import {
  JsonPatchError as jsonpatcherror,
  applyPatch as applypatch,
} from 'fast-json-patch'
import { createdevice } from 'zss/device'
import { useGadgetClient } from 'zss/gadget/data/state'
import { GADGET_STATE } from 'zss/gadget/data/types'

const gadgetclientdevice = createdevice('gadgetclient', [], (message) => {
  const { desync, state } = useGadgetClient.getState()

  switch (message.target) {
    case 'reset':
      if (message.player === state.player) {
        useGadgetClient.setState({
          desync: false,
          state: message.data,
        })
      }
      break
    case 'patch':
      if (message.player === state.player && !desync) {
        try {
          applypatch(state, message.data, true)
        } catch (err) {
          if (err instanceof jsonpatcherror) {
            // we are out of sync and need to request a refresh
            useGadgetClient.setState({ desync: true })
            gadgetclientdevice.reply(
              message,
              'desync',
              undefined,
              message.player,
            )
          }
        }
      }
      break
  }
})

export function getgadgetstate(): GADGET_STATE {
  const { state } = useGadgetClient.getState()
  return state
}

export function gadgetstatesetplayer(player: string) {
  const { state } = useGadgetClient.getState()
  if (player && state.player === '') {
    useGadgetClient.setState({
      state: {
        ...state,
        player,
      },
    })
    return true
  }
  return false
}

export function gadgetstategetplayer() {
  const { state } = useGadgetClient.getState()
  return state.player
}
