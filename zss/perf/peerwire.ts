let peerWireSent = 0
let peerWireRecv = 0

export function recordPeerWireSent(byteLength: number) {
  if (byteLength > 0) {
    peerWireSent += byteLength
  }
}

export function recordPeerWireReceived(byteLength: number) {
  if (byteLength > 0) {
    peerWireRecv += byteLength
  }
}

export function readPeerWireTotals() {
  return { sent: peerWireSent, recv: peerWireRecv }
}
