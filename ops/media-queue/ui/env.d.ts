/// <reference types="vite/client" />

import type { Peer as PeerJs } from 'peerjs'

import type { MQ_BRIDGE, MQ_DEV_BRIDGE } from '../src/shared/ipc'

declare global {
  /** Loaded as a plain script tag from ui/vendor/peerjs.min.js, not bundled. */
  const Peer: typeof PeerJs

  type MQPeer = PeerJs

  interface Window {
    __TAURI__?: MQ_BRIDGE
    mqdev?: MQ_DEV_BRIDGE
  }
}

export {}
