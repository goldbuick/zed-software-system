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
import { nanoid, customAlphabet } from 'nanoid'
import { nolookalikes } from 'nanoid-dictionary'
import { KBuckets } from './k-buckets'

const createPeerId = customAlphabet(nolookalikes, 32)

const BOOSTRAP_ID = '5loXSIFThHidEIEh6h89NQEZpdqI4X4B'

const PEER_JS_OPTIONS = {
  // host: 'zed-cafe-connect.herokuapp.com',
  // secure: true,
  // port: 443,
  debug: 0,
  // config: {
  //   iceServers: [
  //     { urls: 'stun:stun.l.google.com:19302' },
  //     // {
  //     //   urls: [
  //     //     'turn:eu-0.turn.peerjs.com:3478',
  //     //     'turn:us-0.turn.peerjs.com:3478',
  //     //   ],
  //     //   username: 'peerjs',
  //     //   credential: 'peerjsp',
  //     // },
  //   ],
  //   sdpSemantics: 'unified-plan',
  // },
}

export class Gateway {
  private peer: Peer

  static createPeerId() {
    return createPeerId()
  }

  constructor() {
    this.peer = this.host()
    window.addEventListener('beforeunload', this.destroy)
  }

  destroy = () => {
    this.peer.destroy()
    window.removeEventListener('beforeunload', this.destroy)
  }

  host = () => {
    // reset
    if (this.peer) {
      this.peer.destroy()
    }

    // default is to create as host
    this.peer = new Peer(BOOSTRAP_ID, PEER_JS_OPTIONS)

    this.peer.on('open', () => {
      console.info('host: ready on', this.peer.id)
      this.peer.on('close', () =>
        this.retry('connection to handshake server lost'),
      )
    })

    this.peer.on('connection', (dataConnection) => {
      dataConnection.on('open', () => {
        console.info('host: connection from', dataConnection.peer)

        dataConnection.on('close', () => {
          // clean up
        })

        dataConnection.on('data', ({ msg, data }) => {
          // handle messages here
        })
      })
    })

    this.peer.on('error', (error) => {
      console.error('host: error', error.type, error)
      // if (error.type === 'unavailable-id') {
      // fallback to join
      // }
      this.join()
    })

    return this.peer
  }

  join() {
    // reset
    if (this.peer) {
      this.peer.destroy()
    }

    // try to join gateway node
    this.peer = new Peer('', PEER_JS_OPTIONS)

    this.peer.on('open', () => {
      console.info('join: ready on', this.peer.id)
      console.info('join: trying', BOOSTRAP_ID)
      const dataConnection = this.peer.connect(BOOSTRAP_ID)

      dataConnection.on('open', () => {
        console.info('join: connection from', dataConnection.peer)

        dataConnection.on('close', () => {
          // signal retry
        })

        dataConnection.on('data', ({ msg, data }) => {
          // handle messages here
        })
      })

      this.peer.on('close', () =>
        this.retry('connection to handshake server lost'),
      )
    })

    this.peer.on('error', (error) => {
      console.error('join: error', error.type, error)
      if (error.type === 'peer-unavailable') {
        this.retry('unable to connect to host')
      }
    })

    return this.peer
  }

  retry = (reason: string) => {
    console.info('retrying', reason)
    setTimeout(this.host, 5000)
  }
}
