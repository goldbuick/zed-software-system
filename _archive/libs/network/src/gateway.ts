import { range } from '@zss/system/mapping/array'
import Alea from 'alea'
import Peer, { DataConnection } from 'peerjs'

import { sendMessage } from './message'
import {
  MESSAGE,
  PEER_ID_SIZE,
  PEER_JS_OPTIONS,
  PEER_SUB_INTERVAL,
  PEER_SUB_TIMEOUT,
  ROUTE,
  ROUTE_MESSAGE,
} from './types'

const prng = Alea(Date.now() + Math.round(Math.random() * 10000000))

export function randomInteger(a: number, b: number) {
  const min = Math.min(a, b)
  const max = Math.max(a, b)
  const delta = max - min + 1
  return min + Math.floor(prng() * delta)
}

// build conversion tables
const convertToHex: Record<number, string> = {}
const convertToBytes: Record<string, number> = {}
range(0, 255).forEach((value) => {
  const hex = value.toString(16).padStart(2, '0')
  convertToHex[value] = hex
  convertToBytes[hex] = value
})

function getPeerJSUrl(route: string) {
  return [
    PEER_JS_OPTIONS.secure ? 'https' : 'http',
    '://',
    PEER_JS_OPTIONS.host,
    '/',
    PEER_JS_OPTIONS.key,
    route,
  ].join('')
}

function randomByteId() {
  return Uint8Array.from(
    range(PEER_ID_SIZE - 1).map(() => randomInteger(0, 255)),
  )
}

function byteIdToPeerId(id: Uint8Array) {
  return `zss-${[...id].map((value) => convertToHex[value]).join('')}`
}

function peerIdToByteId(hex: string) {
  const bytes = hex.replace('zss-', '').match(/.{1,2}/g)
  if (!bytes) {
    return Uint8Array.from(new Array(32).fill(0))
  }
  return Uint8Array.from(bytes.map((value) => convertToBytes[value]))
}

function compareByteIds(id1: Uint8Array, id2: Uint8Array) {
  const len = Math.min(id1.length, id2.length)
  for (let i = 0; i < len; ++i) {
    if (id1[i] !== id2[i]) {
      return id1[i] < id2[i] ? -1 : 1
    }
  }
  return 0
}

function xorDistance(id1: Uint8Array, id2: Uint8Array) {
  const distance: number[] = []
  const len = Math.min(id1.length, id2.length)

  for (let i = 0; i < len; ++i) {
    distance.push(id1[i] ^ id2[i])
  }

  return Uint8Array.from(distance)
}

function orderByDistanceToByteId(id: Uint8Array, list: Uint8Array[]) {
  const pairs: [Uint8Array, Uint8Array][] = list.map((item) => [
    item,
    xorDistance(id, item),
  ])

  pairs.sort((pair1, pair2) => {
    return compareByteIds(pair1[1], pair2[1])
  })

  return pairs.map((item) => item[0])
}

function nearestByteId(
  id: Uint8Array,
  list: Uint8Array[],
): Uint8Array | undefined {
  const [nearest] = orderByDistanceToByteId(id, list)
  return nearest
}

function nearestPeerId(id: string, list: string[]) {
  const nearest = nearestByteId(peerIdToByteId(id), list.map(peerIdToByteId))
  return nearest ? byteIdToPeerId(nearest) : undefined
}

function createNetworkMessage<
  RouteType extends keyof ROUTE,
  MessageType extends keyof MESSAGE,
>(
  route: RouteType,
  routeData: ROUTE[RouteType],
  message: MessageType,
  messageData: MESSAGE[MessageType],
): ROUTE_MESSAGE<RouteType, MessageType> {
  return { route, routeData, message, messageData }
}

export class Gateway {
  private id: Uint8Array
  private peer: Peer
  private connections: Record<string, DataConnection> = {}

  // connection queue
  private connectTo: string[] = []

  // subscription tables
  private subIds: Set<string> = new Set()
  private subIdTimer: NodeJS.Timer
  private subForwardIds: {
    [k: string]: Record<string, number>
  } = {}

  constructor() {
    window.addEventListener('beforeunload', this.destroy)

    this.id = randomByteId()
    this.peer = new Peer(byteIdToPeerId(this.id), PEER_JS_OPTIONS)
    this.subIdTimer = setInterval(this.pingSubIds, PEER_SUB_INTERVAL * 1000)

    this.peer.on('open', () => {
      sendMessage('GATEWAY_READY', {
        id: this.peer.id,
      })

      this.peer.on('close', () => {
        sendMessage('GATEWAY_LOST', {
          id: this.peer.id,
        })
      })

      // start connecting
      this.bootstrap()
    })

    this.peer.on('connection', this.onDataConnection)

    this.peer.on('error', (error) => {
      const { type, message } = error as unknown as {
        type: string
        message: string
      }
      switch (type) {
        case 'peer-unavailable': {
          const peerId = error.message
            .replace('Could not connect to peer ', '')
            .trim()
          delete this.connections[peerId]
          this.connectToNextPeer()
          break
        }
        default:
          sendMessage('GATEWAY_ERROR', {
            id: this.peer.id,
            type,
            message,
          })
          break
      }
    })
  }

  destroy = () => {
    window.removeEventListener('beforeunload', this.destroy)
    clearInterval(this.subIdTimer)
    this.peer.destroy()
  }

  sendAll<Key extends keyof MESSAGE>(message: Key, data: MESSAGE[Key]) {
    Object.values(this.connections).forEach((dataConnection) => {
      dataConnection.send(
        createNetworkMessage(
          'SND_ALL',
          { received: [this.peer.id] },
          message,
          data,
        ),
      )
    })
  }

  sendTo<Key extends keyof MESSAGE>(
    id: string,
    message: Key,
    data: MESSAGE[Key],
  ) {
    const peer = this.connectionNearestToPeerId(id)
    peer?.send(createNetworkMessage('SND_TO', { id }, message, data))
  }

  subscribeTo(id: string) {
    this.subIds.add(id)
    const peer = this.connectionNearestToPeerId(id)
    peer?.send(createNetworkMessage('SUB_TO', { id }, 'ROUTE_SUB', null))
  }

  unsubscribeTo(id: string) {
    this.subIds.delete(id)
  }

  publish<Key extends keyof MESSAGE>(message: Key, data: MESSAGE[Key]) {
    const id = this.peer.id
    const ids = this.subForwardIds[id] ?? {}
    Object.keys(ids).forEach((item) => {
      const peer: DataConnection | undefined = this.connections[item]
      peer?.send(createNetworkMessage('PUB_TO', { id }, message, data))
    })
  }

  private connectedPeerIds() {
    return Object.keys(this.connections)
  }

  private connectedByteIds() {
    return this.connectedPeerIds().map((item) => peerIdToByteId(item))
  }

  private connectionNearestToPeerId(id: string): DataConnection | undefined {
    const nearest = nearestPeerId(id, this.connectedPeerIds()) ?? ''
    return this.connections[nearest]
  }

  private bootstrap = async () => {
    try {
      // request a list of all available peers to connect to
      const response = await fetch(getPeerJSUrl('/peers'))

      // sort by xor distance
      const result: string[] = await response.json()
      const sortedIds = orderByDistanceToByteId(
        this.id,
        result.map(peerIdToByteId),
      )

      if (compareByteIds(this.id, sortedIds[0]) === 0) {
        // remove our id
        sortedIds.shift()
      }

      // start the connection process
      this.connectTo = sortedIds.map(byteIdToPeerId)
      this.connectToNextPeer()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      sendMessage('GATEWAY_ERROR', {
        id: this.peer.id,
        type: 'fetch-peers',
        message: error.message,
      })
    }
  }

  private connectToNextPeer() {
    // do we have a next peerId to try
    const peerId = this.connectTo.pop()
    if (!peerId) {
      return
    }

    // do we need to connect to more peers?
    if (Object.keys(this.connections).length >= 3) {
      // reset
      this.connectTo = []
      return
    }

    const dataConnection = this.peer.connect(peerId, { reliable: true })
    this.onDataConnection(dataConnection)
  }

  private pingSubIds = () => {
    const subForwardIds = [...this.subIds]
    subForwardIds.forEach((id) => {
      const peer = this.connectionNearestToPeerId(id)
      peer?.send(createNetworkMessage('SUB_TO', { id }, 'ROUTE_SUB', null))
    })
  }

  private onDataConnectionClose(dataConnection: DataConnection) {
    delete this.connections[dataConnection.peer]
    sendMessage('PEER_CONNECTIONS', {
      gateway: this.peer.id,
      ids: Object.keys(this.connections),
    })
  }

  private onDataConnection = (dataConnection: DataConnection) => {
    const onOpen = () => {
      this.connections[dataConnection.peer] = dataConnection
      this.connectToNextPeer()
      sendMessage('PEER_CONNECTIONS', {
        gateway: this.peer.id,
        ids: Object.keys(this.connections),
      })
    }

    if (dataConnection.open) {
      onOpen()
    } else {
      dataConnection.on('open', onOpen)
    }

    dataConnection.on('close', () => this.onDataConnectionClose(dataConnection))

    dataConnection.on('data', (netMessage) => {
      const { route, message, messageData } = netMessage as {
        route: keyof ROUTE
        message: keyof MESSAGE
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        messageData: any
      }

      sendMessage('GATEWAY_ROUTE', {
        route,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        routeData: (netMessage as any).routeData,
      })

      switch (route) {
        case 'SND_ALL': {
          // route to everyone
          const { routeData } = netMessage as { routeData: ROUTE[typeof route] }
          const received = new Set(routeData.received)
          received.add(this.peer.id)

          Object.values(this.connections).forEach((dataConnection) => {
            if (received.has(dataConnection.peer)) {
              return
            }
            dataConnection.send(
              createNetworkMessage(
                'SND_ALL',
                { received: [...received] },
                message,
                messageData,
              ),
            )
          })
          break
        }
        case 'SND_TO': {
          const { routeData } = netMessage as { routeData: ROUTE[typeof route] }
          // route to id
          if (routeData.id === this.peer.id) {
            sendMessage(message, messageData)
          } else {
            const peer = this.connectionNearestToPeerId(routeData.id)
            peer?.send(netMessage)
          }
          break
        }
        case 'SUB_TO': {
          const { routeData } = netMessage as { routeData: ROUTE[typeof route] }
          // record reverse route
          if (!this.subForwardIds[routeData.id]) {
            this.subForwardIds[routeData.id] = {}
          }
          this.subForwardIds[routeData.id][dataConnection.peer] = Date.now()
          // route towards target id
          if (routeData.id !== this.peer.id) {
            const peer = this.connectionNearestToPeerId(routeData.id)
            peer?.send(netMessage)
          }
          break
        }
        case 'PUB_TO': {
          const { routeData } = netMessage as { routeData: ROUTE[typeof route] }
          // lookup reverse route
          const nextPeerIds = Object.keys(
            this.subForwardIds[routeData.id] ?? {},
          )
          nextPeerIds.forEach((peerId) => {
            const delta =
              (Date.now() - (this.subForwardIds[routeData.id][peerId] ?? 0)) /
              1000
            if (delta > PEER_SUB_TIMEOUT) {
              // prune old sub signals
              delete this.subForwardIds[routeData.id][peerId]
            } else {
              // forward along reverse route
              const nextDataConnection = this.connections[peerId]
              nextDataConnection?.send(netMessage)
            }
          })
          break
        }
      }
    })

    dataConnection.on('error', (error) => {
      sendMessage('PEER_ERROR', {
        gateway: this.peer.id,
        id: dataConnection.peer,
        message: error.message,
      })
    })
  }
}
