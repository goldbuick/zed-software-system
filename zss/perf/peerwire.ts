let peerwiresent = 0
let peerwirerecv = 0

export function recordpeerwiresent(bytelength: number) {
  if (bytelength > 0) {
    peerwiresent += bytelength
  }
}

export function recordpeerwirereceived(bytelength: number) {
  if (bytelength > 0) {
    peerwirerecv += bytelength
  }
}

export function readpeerwiretotals() {
  return { sent: peerwiresent, recv: peerwirerecv }
}
