import Client from 'bittorrent-tracker'
import Peer from '@thaunknown/simple-peer/lite.js'

import { objectFromEntries } from 'ts-extras'
import { createdevice } from 'zss/device'
import { doasync } from 'zss/mapping/func'
import { createinfohash } from 'zss/mapping/guid'
import { isarray, ispresent, isstring, MAYBE } from 'zss/mapping/types'
import { shorturl } from 'zss/mapping/url'
import { NAME } from 'zss/words/types'
import { write, writecopyit } from 'zss/words/writeui'

import { network_peer, vm_loader } from './api'
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

let finder: MAYBE<Client>

const trackerlist = `
wss://tracker.btorrent.xyz
wss://tracker.webtorrent.dev
wss://tracker.openwebtorrent.com
`
  .split('\n')
  .map((item) => item.trim())
  .filter((item) => item)

function createpeer(player: string, infohash: string) {
  write(network, `connecting to ${infohash}`)
  const peerid = createinfohash(player)
  finder = new Client({
    infoHash: infohash,
    peerId: peerid,
    announce: trackerlist,
  })
  finder.on('error', (err) => {
    console.info({ err })
  })
  finder.on('warning', (warning) => {
    console.info({ warning })
  })
  finder.on('peer', (peer) => {
    console.info({ peer })
  })
  // node = new Peer(player)
  // node.on('open', () => {
  //   if (ispresent(node)) {
  //     node.on('close', () => write(network, `closed`))
  //     const remote = node.connect(joincode, { reliable: true })
  //     handledataconnection(remote, () => {
  //       write(network, 'connected')
  //       register_ackbooks(peer)
  //     })
  //   }
  // })
  // node.on('error', (error) => api_error(peer, node?.id ?? '', error.message))
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
    case 'peer':
      if (message.player === registerreadplayer() && isstring(message.data)) {
        createpeer(message.player, message.data)
        if (ispresent(finder)) {
          finder.start()
        }
      }
      break
    case 'requestjoincode': {
      if (message.player === registerreadplayer()) {
        doasync(network, async () => {
          if (!ispresent(message.player)) {
            return
          }

          const infohash = createinfohash(message.player)
          
          if (!ispresent(finder)) {
            network_peer(
              network,
              infohash,
              message.player,
            )
          }  
            
          // draw the code to the console
          const joinurl = `${location.origin}/join/#${infohash}`
          const url = await shorturl(joinurl)
          writecopyit(network, url, url)
          write(network, 'ready to join')          
        })
      }
      break
    }
  }
})
