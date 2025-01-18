import { objectFromEntries } from 'ts-extras'
import { createdevice } from 'zss/device'
import { doasync } from 'zss/mapping/func'
import { isarray, MAYBE } from 'zss/mapping/types'
import { NAME } from 'zss/words/types'
import { write } from 'zss/words/writeui'

import { vm_loader } from './api'
import { registerreadplayer } from './register'
import { SOFTWARE } from './session'

async function runnetworkfetch(
  arg: any,
  label: string,
  url: string,
  method: string,
  words: any[],
) {
  let response: MAYBE<Response>
  switch (NAME(method)) {
    case 'get': {
      response = await fetch(url)
      break
    }
    case 'post:json': {
      const entries: [string, any][] = []
      for (let i = 0; i < words.length; i += 2) {
        entries.push([words[i], words[i + 1]])
      }
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(objectFromEntries(entries)),
      })
      break
    }
  }
  if (!response?.ok) {
    return
  }
  const filename = `fetch:${label}`
  const [contenttype] = (response.headers.get('content-type') ?? '').split(';')
  switch (contenttype) {
    case 'text/plain': {
      const content = await response.text()
      write(SOFTWARE, JSON.stringify(content))
      vm_loader(SOFTWARE, arg, 'text', filename, content, registerreadplayer())
      break
    }
    case 'application/json': {
      const content = await response.json()
      write(SOFTWARE, JSON.stringify(content))
      vm_loader(SOFTWARE, arg, 'json', filename, content, registerreadplayer())
      break
    }
    case 'application/octet-stream': {
      const content = await response.arrayBuffer()
      vm_loader(
        SOFTWARE,
        arg,
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
        // arg, label, url, method, words
        const [maybearg, label, url, method, words] = message.data as [
          any,
          string,
          string,
          string,
          any[],
        ]
        doasync(SOFTWARE, async () => {
          await runnetworkfetch(maybearg, label, url, method, words)
        })
      }
      break
  }
})
