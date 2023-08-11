import { PeerJSOption } from 'peerjs'

export const PEER_ID_SIZE = 32

export const PEER_JS_OPTIONS: PeerJSOption = {
  debug: 0,
  port: 443,
  secure: true,
  key: 'peerjs',
  host: 'nest.ili.ac',
}

export const PEER_SUB_INTERVAL = 60
export const PEER_SUB_TIMEOUT = PEER_SUB_INTERVAL * 2

export type MESSAGE = {
  // internal router messages
  ROUTE_SUB: null
  // network messages
  // ready to connect to peers
  GATEWAY_READY: {
    id: string
  }
  // error from peer list server
  GATEWAY_ERROR: {
    id: string
    type: string
    message: string
  }
  // disconnected from peer list server
  GATEWAY_LOST: {
    id: string
  }
  // logging routing info
  GATEWAY_ROUTE: {
    route: keyof ROUTE
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    routeData: any
  }
  // error from peer
  PEER_ERROR: {
    gateway: string
    id: string
    message: string
  }
  // updated list of known peer ids
  PEER_UPDATE: {
    gateway: string
    ids: string[]
  }
  // updated list of connected peer ids
  PEER_CONNECTIONS: {
    gateway: string
    ids: string[]
  }
  // peer subscribe
  PEER_SUB: {
    gateway: string
  }
}

export type ROUTE = {
  // send a message to all peers
  SND_ALL: {
    received: string[]
  }
  // send a message to target id
  SND_TO: {
    id: string
  }
  // subscribe to a target id
  SUB_TO: {
    id: string
  }
  // send a message to anyone subscribed to your id
  PUB_TO: {
    id: string
  }
}

export type ROUTE_MESSAGE<
  RouteType extends keyof ROUTE,
  MessageType extends keyof MESSAGE,
> = {
  route: RouteType
  routeData: ROUTE[RouteType]
  message: MessageType
  messageData: MESSAGE[MessageType]
}
