import { createdevice } from 'zss/device'

import { JSONSYNC_CHANGED } from './api'

const boardrunner = createdevice(
  'boardrunner',
  ['second', 'jsonsync'],
  (message) => {
    if (!boardrunner.session(message)) {
      return
    }
    switch (message.target) {
      case 'jsonsync:changed': {
        const payload = message.data as JSONSYNC_CHANGED
        console.info(
          `[boardrunner] jsonsync ${payload.streamid} ${payload.reason} cv=${payload.cv} sv=${payload.sv}`,
          payload.document,
        )
        break
      }
      case 'second':
        break
      default:
        break
    }
  },
)
