import Peer, { DataConnection } from 'peerjs'
import { createdevice } from 'zss/device'
import { doasync } from 'zss/mapping/func'
import { ispresent, MAYBE } from 'zss/mapping/types'
import { shorturl } from 'zss/mapping/url'
import { write, writecopyit } from 'zss/words/writeui'

import { api_error, peer_create, peer_joincode, register_ackbooks } from './api'
import { createforward } from './forward'
import { registerreadplayer } from './register'

let node: MAYBE<Peer>
// nuke it for cleaner close
function beforeunload() {
  node?.destroy()
  node = undefined
}
window.addEventListener('beforeunload', beforeunload)

function handledataconnection(remote: DataConnection, onopen?: () => void) {
  // signal connected
  remote.on('open', () => {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    const { forward, disconnect } = createforward((message) =>
      remote.send(message),
    )
    remote.on('close', () => {
      disconnect()
      write(peer.name(), `remote ${remote.peer} disconnected`)
    })
    remote.on('data', forward)
    onopen?.()
  })
  remote.on('error', (error) => {
    const id = node?.id ?? ''
    api_error(
      peer.session(),
      peer.name(),
      `${id}-${remote.peer}`,
      error.message,
    )
  })
}

function createhost(player: string) {
  write(peer.name(), 'connecting...')
  node = new Peer(player)
  node.on('open', () => {
    if (ispresent(node)) {
      node.on('connection', handledataconnection)
      node.on('close', () => write(peer.name(), `closed`))
      peer_joincode(peer.session(), peer.name(), player)
    }
  })
  node.on('error', (error) =>
    api_error(peer.session(), peer.name(), node?.id ?? '', error.message),
  )
}

function createjoin(player: string, joincode: string) {
  write(peer.name(), `connecting to ${joincode}`)
  node = new Peer(player)
  node.on('open', () => {
    if (ispresent(node)) {
      node.on('close', () => write(peer.name(), `closed`))
      const remote = node.connect(joincode, { reliable: true })
      handledataconnection(remote, () => {
        write(peer.name(), 'connected')
        register_ackbooks(peer.session(), peer.name(), player)
      })
    }
  })
  node.on('error', (error) =>
    api_error(peer.session(), peer.name(), node?.id ?? '', error.message),
  )
}

const peer = createdevice('peer', [], (message) => {
  if (!peer.session(message)) {
    return
  }
  switch (message.target) {
    case 'create':
      if (message.player === registerreadplayer()) {
        if (!message.data) {
          createhost(message.player)
        } else {
          createjoin(message.player, message.data)
        }
      }
      break
    case 'joincode': {
      if (message.player === registerreadplayer()) {
        doasync('peer:joincode', async () => {
          if (!ispresent(message.player)) {
            return
          }
          if (!ispresent(node)) {
            // create a host peer
            peer_create(peer.session(), peer.name(), '', message.player)
          } else {
            // draw the code to the console
            const joinurl = `${location.origin}/join/#${node.id}`
            const url = await shorturl(joinurl)
            writecopyit(peer.name(), url, url)
            write(peer.name(), 'ready to join')
          }
        })
      }
      break
    }
  }
})
