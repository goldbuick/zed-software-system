/**
 * @jest-environment jsdom
 */
import {
  iswanixspaceactive,
  readwanixhoststate,
  resetwanixhostfortest,
  runwanixcommand,
  spawnwanixspace,
} from 'zss/feature/wanix/wanixiframehost'

describe('wanixiframehost', () => {
  afterEach(() => {
    resetwanixhostfortest()
  })

  it('reports idle before spawn', () => {
    expect(readwanixhoststate()).toBe('idle')
    expect(iswanixspaceactive()).toBe(false)
  })

  it('rejects duplicate spawn', async () => {
    const mount = document.createElement('div')
    mount.id = 'zss-wanix-display'
    document.body.appendChild(mount)

    const append = jest
      .spyOn(mount, 'appendChild')
      .mockImplementation((node) => {
        if (node instanceof HTMLIFrameElement) {
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
    expect(iswanixspaceactive()).toBe(true)

    await expect(spawnwanixspace(device, 'player1')).rejects.toThrow(
      'wanix already active',
    )

    append.mockRestore()
    resetwanixhostfortest()
    mount.remove()
  })

  it('rejects run when not ready', async () => {
    await expect(runwanixcommand('hello.wasm')).rejects.toThrow(
      'wanix not running',
    )
  })
})
