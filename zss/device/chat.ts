import { ChatClient } from '@twurple/chat'
import { createdevice } from 'zss/device'
import { ispresent, isstring, MAYBE } from 'zss/mapping/types'
import { write } from 'zss/words/writeui'

import { api_error, vm_loader } from './api'
import { registerreadplayer } from './register'

let twitchchatclient: MAYBE<ChatClient>

const chat = createdevice('chat', [], (message) => {
  switch (message.target) {
    case 'connect':
      if (ispresent(twitchchatclient)) {
        api_error(chat.name(), 'connection', 'chat is already connected')
      } else if (isstring(message.data)) {
        write(chat.name(), 'connecting')
        twitchchatclient = new ChatClient({ channels: [message.data] })
        twitchchatclient.connect()
        twitchchatclient.onConnect(() => {
          write(chat.name(), 'connected')
        })
        twitchchatclient.onDisconnect(() => {
          write(chat.name(), 'disconnected')
        })
        twitchchatclient.onMessage((_, user, text) => {
          vm_loader(
            chat.name(),
            'chat',
            message.data,
            `${user}:${text}`,
            registerreadplayer(),
          )
        })
      }
      break
    case 'disconnect':
      if (ispresent(twitchchatclient)) {
        twitchchatclient.quit()
        twitchchatclient = undefined
        write(chat.name(), 'client quit')
      } else {
        api_error(chat.name(), 'connection', 'chat is already disconnected')
      }
      break
    default:
      break
  }
})

//
