import {
  JsonPatchError as jsonpatcherror,
  applyPatch as applypatch,
} from 'fast-json-patch'
import { createdevice } from 'zss/device'
import { useGadgetClient } from 'zss/gadget/data/state'

const gadgetclientdevice = createdevice('gadgetclient', [], (message) => {
  const { desync, gadget } = useGadgetClient.getState()
  switch (message.target) {
    case 'reset':
      if (message.player === gadget.player) {
        console.info('reset', message.data)
        console.info('----------')
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
            console.info('message.patch', message.data)
            applypatch(gadgetclient.gadget, message.data, true)
            console.info('----------')
            return {
              ...gadgetclient,
              gadget: {
                ...gadgetclient.gadget,
              },
            }
          } catch (err) {
            if (err instanceof jsonpatcherror) {
              console.info(err.message)
              console.info('----------')
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
