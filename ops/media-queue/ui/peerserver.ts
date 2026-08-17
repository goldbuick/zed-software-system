import type { PeerOptions } from 'peerjs'

// Keep in sync with zss/feature/peerserver.ts (STUN-only; no dead turn.peerjs.com).
const PEER_ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }]

export function mqpeerserveroptions(extra?: PeerOptions): PeerOptions {
  return {
    host: 'terminal.zed.cafe',
    secure: true,
    port: 443,
    config: {
      iceServers: PEER_ICE_SERVERS,
      sdpSemantics: 'unified-plan',
    },
    ...(extra || {}),
  }
}
