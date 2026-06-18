/**
 * @jest-environment jsdom
 */
const postmessages: unknown[] = []

jest.mock('zss/mapping/guid', () => ({
  createsid: jest.fn(() => `sid-${postmessages.length}`),
}))

import {
  resetwanixhostfortest,
  sendwanixtermwriteraw,
  spawnwanixspace,
} from 'zss/feature/wanix/wanixiframehost'

describe('sendwanixtermwriteraw', () => {
  const mount = document.createElement('div')
  mount.id = 'zss-wanix-display'

  beforeEach(() => {
    jest.clearAllMocks()
    postmessages.length = 0
    resetwanixhostfortest()
    document.body.appendChild(mount)
  })

  afterEach(() => {
    resetwanixhostfortest()
    mount.remove()
  })

  async function wirehost() {
    const append = jest
      .spyOn(mount, 'appendChild')
      .mockImplementation((node) => {
        if (node instanceof HTMLIFrameElement) {
          const contentwin = {
            postMessage: (payload: unknown) => {
              postmessages.push(payload)
              const msg = payload as { type?: string; id?: string }
              if (msg.type === 'wanix:term-write' && msg.id) {
                queueMicrotask(() => {
                  window.dispatchEvent(
                    new MessageEvent('message', {
                      data: { type: 'wanix:term-write:done', id: msg.id },
                      origin: window.location.origin,
                    }),
                  )
                })
              }
            },
          }
          Object.defineProperty(node, 'contentWindow', {
            value: contentwin,
          })
          setTimeout(() => {
            window.dispatchEvent(
              new MessageEvent('message', {
                data: { type: 'wanix:ready' },
                origin: window.location.origin,
              }),
            )
          }, 0)
        }
        return node
      })
    const device = { emit: jest.fn() }
    await spawnwanixspace(device, 'player1')
    append.mockRestore()
    postmessages.length = 0
  }

  it('serializes concurrent raw writes', async () => {
    await wirehost()
    const order: number[] = []
    const first = sendwanixtermwriteraw(new Uint8Array([97])).then(() => {
      order.push(1)
    })
    const second = sendwanixtermwriteraw(new Uint8Array([98])).then(() => {
      order.push(2)
    })
    await Promise.all([first, second])
    expect(order).toEqual([1, 2])
    expect(postmessages).toHaveLength(2)
    const firstmsg = postmessages[0] as { stream?: boolean; bytes?: ArrayBuffer }
    expect(firstmsg.stream).toBe(true)
    expect(new Uint8Array(firstmsg.bytes ?? [])).toEqual(new Uint8Array([97]))
  })
})
