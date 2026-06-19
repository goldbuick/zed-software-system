/**
 * @jest-environment jsdom
 */
import {
  resetwanixhostfortest,
  sendwanixterminput,
  sendwanixtermwriteraw,
  wanixhosttestwirewriter,
} from 'zss/feature/wanix/wanixhost'

describe('sendwanixterminput', () => {
  beforeEach(() => {
    resetwanixhostfortest()
  })

  afterEach(() => {
    resetwanixhostfortest()
  })

  it('writes encoded bytes to attached term writer', async () => {
    const writes: Uint8Array[] = []
    wanixhosttestwirewriter('vm', 'linux-vm', (bytes) => {
      writes.push(bytes)
    })
    await sendwanixterminput('a')
    expect(writes).toHaveLength(1)
    expect(Array.from(writes[0] ?? [])).toEqual([97])
  })

  it('serializes concurrent term-input writes', async () => {
    const order: number[] = []
    const writes: Uint8Array[] = []
    wanixhosttestwirewriter('vm', 'linux-vm', (bytes) => {
      writes.push(bytes)
    })
    const first = sendwanixterminput('a').then(() => {
      order.push(1)
    })
    const second = sendwanixterminput('b').then(() => {
      order.push(2)
    })
    await Promise.all([first, second])
    expect(order).toEqual([1, 2])
    expect(writes).toHaveLength(2)
  })

  it('routes sendwanixtermwriteraw through term-input encoding', async () => {
    const writes: Uint8Array[] = []
    wanixhosttestwirewriter('vm', 'linux-vm', (bytes) => {
      writes.push(bytes)
    })
    await sendwanixtermwriteraw(new Uint8Array([3]))
    expect(writes).toHaveLength(1)
    expect(Array.from(writes[0] ?? [])).toEqual([3])
  })
})
