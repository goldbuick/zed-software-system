/**
 * Polyfill browser globals for PeerJS in Node.js.
 * PeerJS expects location, navigator, and WebRTC APIs; set them before importing peerjs.
 * Uses @roamhq/wrtc for WebRTC (darwin-arm64, maintained).
 */
import { createRequire } from 'node:module'

if (typeof globalThis.location === 'undefined') {
  ;(globalThis as unknown as { location: Location }).location = {
    protocol: 'https:',
    host: 'terminal.zed.cafe',
    hostname: 'terminal.zed.cafe',
    href: 'https://terminal.zed.cafe/',
    origin: 'https://terminal.zed.cafe',
  } as Location
}
if (typeof globalThis.navigator === 'undefined') {
  ;(globalThis as unknown as { navigator: Navigator }).navigator = {
    userAgent: 'Node.js',
  } as Navigator
}

// WebRTC globals for PeerJS (uses @roamhq/wrtc - maintained, darwin-arm64 support)
if (typeof (globalThis as any).RTCPeerConnection === 'undefined') {
  const base =
    typeof import.meta?.url === 'string'
      ? import.meta.url
      : `${process.cwd()}/package.json`
  const wrtc = createRequire(base)('@roamhq/wrtc')
  ;(globalThis as any).RTCPeerConnection = wrtc.RTCPeerConnection
  ;(globalThis as any).RTCDataChannel = wrtc.RTCDataChannel
  ;(globalThis as any).RTCSessionDescription = wrtc.RTCSessionDescription
  ;(globalThis as any).RTCIceCandidate = wrtc.RTCIceCandidate
}
