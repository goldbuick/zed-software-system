import { ChatClient } from '@twurple/chat'
import { createdevice } from 'zss/device'
import { write } from 'zss/feature/writeui'
import { ispresent, isstring, MAYBE } from 'zss/mapping/types'

import { api_error, vm_loader } from './api'
import { registerreadplayer } from './register'

let twitchchatclient: MAYBE<ChatClient>

const chat = createdevice('chat', [], (message) => {
  if (!chat.session(message)) {
    return
  }
  switch (message.target) {
    case 'connect':
      if (ispresent(twitchchatclient)) {
        api_error(chat, 'connection', 'chat is already connected')
      } else if (isstring(message.data)) {
        write(chat, `connecting to ${message.data}`)
        twitchchatclient = new ChatClient({ channels: [message.data] })
        twitchchatclient.connect()
        twitchchatclient.onConnect(() => {
          write(chat, 'connected')
        })
        twitchchatclient.onDisconnect(() => {
          write(chat, 'disconnected')
        })
        twitchchatclient.onMessage((_, user, text) => {
          vm_loader(
            chat,
            undefined,
            'text',
            `chat:message:${message.data}`,
            `${user}:${text}`,
            registerreadplayer(),
          )
        })
        twitchchatclient.onAction((_, user, text) => {
          vm_loader(
            chat,
            undefined,
            'text',
            `chat:action:${message.data}`,
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
        write(chat, 'client quit')
      } else {
        api_error(chat, 'connection', 'chat is already disconnected')
      }
      break
    default:
      break
  }
})

//
