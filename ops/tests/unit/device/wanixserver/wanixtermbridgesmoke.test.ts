import {
  WANIX_TERM_BRIDGE_PONG,
  trackwanixtermlinebuf,
} from 'zss/device/wanixserver/termbridgesmoke'

describe('wanixtermbridgesmoke', () => {
  it('exports pong bytes for the bridge smoke reply', () => {
    expect(WANIX_TERM_BRIDGE_PONG).toBe('-> pong\r\n')
  })

  it('accumulates printable keys until enter', () => {
    let buf = ''
    ;({ nextbuf: buf } = trackwanixtermlinebuf(buf, 'p'))
    ;({ nextbuf: buf } = trackwanixtermlinebuf(buf, 'i'))
    ;({ nextbuf: buf } = trackwanixtermlinebuf(buf, 'n'))
    const done = trackwanixtermlinebuf(buf, 'g')
    expect(done.nextbuf).toBe('ping')
    expect(done.pong).toBe(false)
  })

  it('replies pong when a completed line is ping', () => {
    const done = trackwanixtermlinebuf('ping', '\r')
    expect(done.pong).toBe(true)
    expect(done.nextbuf).toBe('')
  })

  it('does not reply pong for other lines', () => {
    const done = trackwanixtermlinebuf('hello', '\n')
    expect(done.pong).toBe(false)
  })

  it('handles backspace while buffering', () => {
    let buf = 'pin'
    ;({ nextbuf: buf } = trackwanixtermlinebuf(buf, '\x7f'))
    const done = trackwanixtermlinebuf(buf, '\r')
    expect(done.pong).toBe(false)
  })
})
