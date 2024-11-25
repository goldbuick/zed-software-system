import {
  JsonPatchError as jsonpatcherror,
  applyPatch as applypatch,
} from 'fast-json-patch'
import { createdevice } from 'zss/device'
import { useGadgetClient } from 'zss/gadget/data/state'
import { GADGET_STATE } from 'zss/gadget/data/types'

const gadgetclientdevice = createdevice('gadgetclient', [], (message) => {
  const { desync, gadget } = useGadgetClient.getState()

  switch (message.target) {
    case 'reset':
      if (message.player === gadget.player) {
        useGadgetClient.setState({
          desync: false,
          gadget: message.data,
        })
      }
      break
    case 'patch':
      if (message.player === gadget.player && !desync) {
        useGadgetClient.setState((gadgetclient) => {
          try {
            applypatch(gadgetclient.gadget, message.data, true)
          } catch (err) {
            if (err instanceof jsonpatcherror) {
              // we are out of sync and need to request a refresh
              gadgetclient.desync = true
              gadgetclientdevice.reply(
                message,
                'desync',
                undefined,
                message.player,
              )
            }
          }
          return gadgetclient
        })
      }
      break
  }
})

export function getgadgetstate(): GADGET_STATE {
  return useGadgetClient.getState().gadget
}

export function gadgetstatesetplayer(player: string) {
  const gadget = getgadgetstate()
  if (player && gadget.player === '') {
    useGadgetClient.setState((state) => ({
      gadget: {
        ...state.gadget,
        player,
      },
    }))
    return true
  }
  return false
}

export function gadgetstategetplayer() {
  return getgadgetstate().player
}
