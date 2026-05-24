import { createdevice } from 'zss/device'

import './boardrunner/gadgetstate'
import { shouldprocessboardrunnermessage } from './boardrunner/filter'
import {
  boardrunnerhandlers,
  handleboardrunnerdefault,
} from './boardrunner/handlers/registry'

const boardrunner = createdevice('boardrunner', ['chip'], (message) => {
  if (!boardrunner.session(message)) {
    return
  }
  if (!shouldprocessboardrunnermessage(message)) {
    return
  }
  const handler =
    boardrunnerhandlers[message.target] ?? handleboardrunnerdefault
  handler(boardrunner, message)
})
