/** STUN-only until we deploy our own TURN (PeerJS defaults include dead turn.peerjs.com). */
export function peericeservers(): RTCIceServer[] {
  return [{ urls: 'stun:stun.l.google.com:19302' }]
}

/** Shared PeerJS PeerServer options for cafe clique + media helpers. */
export function peerserveroptions() {
  return {
    debug: 0,
    host: 'terminal.zed.cafe',
    secure: true,
    port: 443,
    config: {
      iceServers: peericeservers(),
      sdpSemantics: 'unified-plan',
    },
  }
}
