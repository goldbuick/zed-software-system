/** Smoke reply for ops/fixtures/public/wanix/termbridge.wasm — not guest WASI stdin. */
export const WANIX_TERM_BRIDGE_PONG = '-> pong\r\n'

export function trackwanixtermlinebuf(
  linebuf: string,
  text: string,
): { nextbuf: string; pong: boolean } {
  if (text === '\r' || text === '\n') {
    return { nextbuf: '', pong: linebuf.trim() === 'ping' }
  }
  if (text === '\x7f' || text === '\b') {
    return { nextbuf: linebuf.slice(0, -1), pong: false }
  }
  if (text.length === 1 && text.charCodeAt(0) >= 32) {
    return { nextbuf: linebuf + text, pong: false }
  }
  return { nextbuf: linebuf, pong: false }
}
