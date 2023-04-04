/*

Do we even need k-buckets ??
Is XOR distance a sufficient metric ?

v1 approach
  We poll for an updated list of peers
  We connect to the 3 closest to our ID
  We route messages accordingly
    We still need PUB/SUB tables

*/

import Peer, { DataConnection, PeerJSOption } from 'peerjs'
import { range } from '@zss/system/mapping/array'
import Alea from 'alea'

const prng = Alea(Date.now() + Math.round(Math.random() * 10000000))

export function randomInteger(a: number, b: number) {
  const min = Math.min(a, b)
  const max = Math.max(a, b)
  const delta = max - min + 1
  return min + Math.floor(prng() * delta)
}

const PEER_ID_SIZE = 16

const PEER_JS_OPTIONS: PeerJSOption = {
  debug: 0,
  port: 443,
  secure: true,
  key: 'peerjs',
  host: 'nest.ili.ac',
}

// build conversion tables
const convertToHex: Record<number, string> = {}
const convertToBytes: Record<string, number> = {}
range(0, 255).forEach((value) => {
  const hex = value.toString(16).padStart(2, '0')
  convertToHex[value] = hex
  convertToBytes[hex] = value
})

export class Gateway {
  private id: Uint8Array
  private peer: Peer

  // connection queue
  private connectTo: string[] = []

  static getPeerJSUrl(route: string) {
    return [
      PEER_JS_OPTIONS.secure ? 'https' : 'http',
      '://',
      PEER_JS_OPTIONS.host,
      '/',
      PEER_JS_OPTIONS.key,
      route,
    ].join('')
  }

  static randomBytes() {
    return Uint8Array.from(
      range(PEER_ID_SIZE - 1).map(() => randomInteger(0, 255)),
    )
  }

  static bytesToPeerId(id: Uint8Array) {
    return `zss-${[...id].map((value) => convertToHex[value]).join('')}`
  }

  static peerIdToBytes(hex: string) {
    const bytes = hex.replace('zss-', '').match(/.{1,2}/g)
    if (!bytes) {
      return Uint8Array.from(new Array(32).fill(0))
    }
    return Uint8Array.from(bytes.map((value) => convertToBytes[value]))
  }

  static compareIds(id1: Uint8Array, id2: Uint8Array) {
    const len = Math.min(id1.length, id2.length)
    for (let i = 0; i < len; ++i) {
      if (id1[i] !== id2[i]) {
        return id1[i] < id2[i] ? -1 : 1
      }
    }
    return 0
  }

  static xorDistance(id1: Uint8Array, id2: Uint8Array) {
    const distance: number[] = []
    const len = Math.min(id1.length, id2.length)

    for (let i = 0; i < len; ++i) {
      distance.push(id1[i] ^ id2[i])
    }

    return Uint8Array.from(distance)
  }

  static orderByDistanceToId(id: Uint8Array, list: Uint8Array[]) {
    return list.sort(Gateway.compareIds)
  }

  constructor() {
    window.addEventListener('beforeunload', this.destroy)

    this.id = Gateway.randomBytes()
    this.peer = new Peer(Gateway.bytesToPeerId(this.id), PEER_JS_OPTIONS)

    this.peer.on('open', () => {
      this.peer.on('close', () => {
        // signal something ??
      })

      console.info('gateway: ready on', this.peer.id)
      this.bootstrap()
    })

    this.peer.on('connection', this.onDataConnection)

    this.peer.on('error', (error) => {
      console.error('gateway: error', error.type, error)
    })
  }

  destroy = () => {
    this.peer.destroy()
    window.removeEventListener('beforeunload', this.destroy)
  }

  async bootstrap() {
    try {
      // request a list of all available peers to connect to
      const response = await fetch(Gateway.getPeerJSUrl('/peers'))

      // sort by xor distance
      const result: string[] = await response.json()
      const sortedIds = Gateway.orderByDistanceToId(
        this.id,
        result.map(Gateway.peerIdToBytes),
      )

      // start the connection process
      this.connectTo = sortedIds.map(Gateway.bytesToPeerId)
      this.connectTo.unshift('zss-rrrrrrrrrrrrr')
      this.connectToNextPeer()
    } catch (error) {
      console.info('gateway: error fetching peer list', error)
    }
  }

  connectToNextPeer() {
    // this.peer.
    const peerId = this.connectTo.pop()
    if (!peerId) {
      return
    }

    console.info('gateway: trying', peerId)
    const dataConnection = this.peer.connect(peerId, { reliable: true })
    this.onDataConnection(dataConnection)
  }

  onDataConnection = (dataConnection: DataConnection) => {
    // let didConnect = true

    function onOpen() {
      console.info('dataConnection: connection from', dataConnection.peer)
    }

    if (dataConnection.open) {
      onOpen()
    } else {
      dataConnection.on('open', onOpen)
    }

    dataConnection.on('close', () => {
      console.error('dataConnection: close')
    })

    dataConnection.on('data', ({ msg, data }) => {
      // handle messages here
    })

    dataConnection.on('error', (error) => {
      console.error('dataConnection: error', error.type, error)
    })
  }
}
