import { objectFromEntries } from 'ts-extras'
import { createdevice } from 'zss/device'
import { doasync } from 'zss/mapping/func'
import { isarray, isstring, MAYBE } from 'zss/mapping/types'
import { shorturl } from 'zss/mapping/url'
import { peerstart, peerjoin } from 'zss/pubsub/peer'
import { NAME } from 'zss/words/types'
import { write, writecopyit } from 'zss/words/writeui'

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
  const eventname = `fetch:${label}`
  const [contenttype] = (response.headers.get('content-type') ?? '').split(';')
  switch (contenttype) {
    case 'text/plain': {
      const content = await response.text()
      write(SOFTWARE, JSON.stringify(content))
      vm_loader(SOFTWARE, arg, 'text', eventname, content, registerreadplayer())
      break
    }
    case 'application/json': {
      const content = await response.json()
      write(SOFTWARE, JSON.stringify(content))
      vm_loader(SOFTWARE, arg, 'json', eventname, content, registerreadplayer())
      break
    }
    case 'application/octet-stream': {
      const content = await response.arrayBuffer()
      vm_loader(
        SOFTWARE,
        arg,
        'binary',
        eventname,
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
    case 'start':
      if (message.player === registerreadplayer()) {
        peerstart(!!message.data, message.player)
      }
      break
    case 'join':
      if (message.player === registerreadplayer() && isstring(message.data)) {
        peerjoin(message.data, message.player)
      }
      break
    case 'showjoincode': {
      doasync(network, async () => {
        if (message.player === registerreadplayer() && isarray(message.data)) {
          const [hidden, topic] = message.data as [boolean, string]
          const joinurl = `${location.origin}/join/#${topic}`
          const url = await shorturl(joinurl)
          if (hidden) {
            writecopyit(network, url, `secret join url`, false)
          } else {
            writecopyit(network, url, url)
          }
        }
      })
      break
    }
  }
})
