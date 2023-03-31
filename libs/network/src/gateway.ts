/*

This file manages the mechnaism that allows nodes to bootstrap into the network

1.We connect to the bootstrap node and issue a JOIN message with our id
  This message is routed towards our id, we are essentially trying to send a message to ourself
  Nodes along the way, should connect temporarily to the joining node so the joining node can have their
  ID added to their routing table
2.We stay connected to (X) number of closest peers
3.This is simply a messaging network designed at handling larger scale of users

Idea for how client/server routing would work
1.client sends a SUB message to given ID
2.intermediate nodes build a SUB lookup table
  this is a way to send the message back to nodes interested in messages

*/

import Peer from 'peerjs'
import { nanoid } from 'nanoid'
import { PEER_JS_OPTIONS } from './types'
import { MESSAGE } from './message'

type GatewayMessage = {
  msg: MESSAGE
  data: any
}

export class Gateway {
  private peer: Peer

  constructor(private boostrapId: string) {
    this.peer = this.host()
    window.addEventListener('beforeunload', this.destroy)
  }

  destroy = () => {
    this.peer.destroy()
    window.removeEventListener('beforeunload', this.destroy)
  }

  host() {
    // default is to create as host
    this.peer = new Peer(this.boostrapId, PEER_JS_OPTIONS)

    this.peer.on('error', (error) => {
      if (error.type === 'unavailable-id') {
        // fallback to join
        this.join()
        // onHostExists()
      } else if (error.type !== 'invalid-id') {
        // signal reset here
      } else {
        console.error(error)
      }
    })

    this.peer.on('open', () => {
      this.peer.on('close', () => [
        // signal reset here ...
      ])
    })

    this.peer.on('connection', (dataConnection) => {
      dataConnection.on('open', () => {
        dataConnection.on('close', () => {
          // clean up
        })

        dataConnection.on('data', ({ msg, data }) => {
          // handle messages here
        })
      })
    })

    return this.peer
  }

  join() {
    this.peer = new Peer(nanoid())

    this.peer.on('open', () => {
      const dataConnection = this.peer.connect(this.boostrapId)
      dataConnection.on('open', () => {
        dataConnection.on('close', () => {
          // signal retry
        })

        dataConnection.on('data', ({ msg, data }) => {
          // handle messages here
        })
      })
    })

    this.peer.on('close', () => {
      // signal retry
    })

    this.peer.on('error', (error) => {
      // signal retry
    })

    return this.peer
  }
}
