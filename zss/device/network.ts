import { createdevice } from 'zss/device'
import { doasync } from 'zss/mapping/func'
import { isarray, ispresent, MAYBE } from 'zss/mapping/types'

import { vm_loader } from './api'
import { registerreadplayer } from './register'
import { SOFTWARE } from './session'

async function runnetworkfetch(
  arg: any,
  url: string,
  method: string,
  words: any[],
) {
  let response: MAYBE<Response>
  switch (method) {
    case 'get': {
      response = await fetch(url)
      break
    }
  }
  if (!response?.ok) {
    return
  }
  const filename = `fetch${ispresent(arg) ? `:${arg}` : ''}`
  const [contenttype] = (response.headers.get('content-type') ?? '').split(';')
  switch (contenttype) {
    case 'text/plain': {
      const content = await response.text()
      vm_loader(SOFTWARE, 'text', filename, content, registerreadplayer())
      break
    }
    case 'application/json': {
      const content = await response.json()
      vm_loader(SOFTWARE, 'json', filename, content, registerreadplayer())
      break
    }
    case 'application/octet-stream': {
      const content = await response.arrayBuffer()
      vm_loader(
        SOFTWARE,
        'binary',
        filename,
        new Uint8Array(content),
        registerreadplayer(),
      )
      break
    }
  }
}

const network = createdevice('network', [], (message) => {
  if (!network.session(message)) {
    return
  }
  switch (message.target) {
    case 'fetch':
      if (isarray(message.data)) {
        const [maybearg, url, method, words] = message.data as [
          any,
          string,
          string,
          any[],
        ]
        doasync(SOFTWARE, async () => {
          await runnetworkfetch(maybearg, url, method, words)
        })
      }
      break
  }
})
