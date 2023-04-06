export enum MESSAGE {
  PEER_UPDATE = 1,
}

export interface MESSAGE_DATA {
  [MESSAGE.PEER_UPDATE]: {
    ids: string[]
  }
}

export enum ROUTE {
  // send a message to all peers
  SND_ALL = 1,
  // send a message to target id
  SND_TO,
  // subscribe to a target id
  SUB_TO,
  // send a message to anyone subscribed to your id
  PUB_TO,
}

export interface ROUTE_DATA {
  [ROUTE.SND_ALL]: {
    received: string[]
  }
  [ROUTE.SND_TO]: {
    id: string
  }
  [ROUTE.SUB_TO]: {
    id: string
  }
  [ROUTE.PUB_TO]: {
    id: string
  }
}
