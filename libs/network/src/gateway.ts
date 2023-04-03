/*

Do we even need k-buckets ??
Is XOR distance a sufficient metric ?

v1 approach
  We poll for an updated list of peers
  We connect to the 3 closest to our ID
  We route messages accordingly
    We still need PUB/SUB tables

*/

import Peer, { PeerJSOption } from 'peerjs'

const PEER_JS_OPTIONS: PeerJSOption = {
  debug: 1,
  port: 443,
  secure: true,
  key: 'peerjs',
  host: 'nest.ili.ac',
}

function randomBits() {
  return (Math.random() * 4294967296) >>> 0
}

export class Gateway {
  private peer: Peer

  static createPeerId() {
    return `zss-${randomBits().toString(16)}`
  }

  constructor() {
    window.addEventListener('beforeunload', this.destroy)

    this.peer = new Peer(Gateway.createPeerId(), PEER_JS_OPTIONS)

    this.peer.on('open', () => {
      this.peer.on('close', () => {
        // signal something ??
      })

      console.info('gateway: ready on', this.peer.id)
      this.join()
    })

    this.peer.on('connection', (dataConnection) => {
      dataConnection.on('open', () => {
        console.info('gateway: connection from', dataConnection.peer)

        dataConnection.on('close', () => {
          // clean up
        })

        dataConnection.on('data', ({ msg, data }) => {
          // handle messages here
        })
      })
    })

    this.peer.on('error', (error) => {
      console.error('gateway: error', error.type, error)
    })
  }

  destroy = () => {
    this.peer.destroy()
    window.removeEventListener('beforeunload', this.destroy)
  }

  async join() {
    try {
      const apiUrl = `${PEER_JS_OPTIONS.secure ? 'https' : 'http'}://${
        PEER_JS_OPTIONS.host
      }:${PEER_JS_OPTIONS.port}/${PEER_JS_OPTIONS.key}/peers`
      const response = await fetch(apiUrl)
      const result = await response.json()
      //
      console.info(result)
    } catch (error) {
      console.info('gateway: error fetching peer list', error)
    }
  }
}
