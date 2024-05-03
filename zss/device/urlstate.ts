import {
  decompressFromEncodedURIComponent,
  compressToEncodedURIComponent,
} from 'lz-string'
import { createdevice } from 'zss/device'
import { ispresent } from 'zss/mapping/types'

function readstate() {
  try {
    const hash = window.location.hash.slice(1)
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    return JSON.parse(decompressFromEncodedURIComponent(hash) || '{}') as any
  } catch (err) {
    return {} as any
  }
}

function writestate(state: any) {
  const out = `#${compressToEncodedURIComponent(JSON.stringify(state))}`
  window.location.hash = out
}

const urlstate = createdevice('urlstate', [], (message) => {
  switch (message.target) {
    case 'read': {
      const name = message.data ?? ''
      const current = readstate()
      if (ispresent(current)) {
        const value = current[name]
        urlstate.reply(message, 'urlstate', [name, value ?? 0])
      } else {
        console.info(name, 'is empty')
      }
      break
    }
    case 'write': {
      const [name, value] = message.data
      const current = readstate()
      if (ispresent(current)) {
        current[name] = value
        writestate(current)
        console.info('wrote', value, 'to', name)
      }
      break
    }
  }
})
