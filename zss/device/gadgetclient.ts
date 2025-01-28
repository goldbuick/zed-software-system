import {
  JsonPatchError as jsonpatcherror,
  applyPatch as applypatch,
} from 'fast-json-patch'
import { createdevice } from 'zss/device'
import { useGadgetClient } from 'zss/gadget/data/state'

import { registerreadplayer } from './register'

const gadgetclientdevice = createdevice('gadgetclient', [], (message) => {
  if (!gadgetclientdevice.session(message)) {
    return
  }
  const { desync } = useGadgetClient.getState()
  switch (message.target) {
    case 'paint':
      if (message.player === registerreadplayer()) {
        useGadgetClient.setState({
          desync: false,
          gadget: message.data,
        })
      }
      break
    case 'patch':
      if (message.player === registerreadplayer() && !desync) {
        useGadgetClient.setState((gadgetclient) => {
          try {
            const { newDocument } = applypatch(
              gadgetclient.gadget,
              message.data,
              true,
              false,
            )
            return {
              ...gadgetclient,
              gadget: newDocument,
            }
          } catch (err) {
            if (err instanceof jsonpatcherror) {
              useGadgetClient.setState({ desync: true })
              // we are out of sync and need to request a refresh
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
