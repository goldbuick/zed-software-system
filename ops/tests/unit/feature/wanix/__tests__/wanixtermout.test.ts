/**
 * @jest-environment jsdom
 */
const mockscreenwrite = jest.fn()

jest.mock('zss/feature/wanix/wanixtermscreen', () => {
  const actual = jest.requireActual('zss/feature/wanix/wanixtermscreen')
  return {
    ...actual,
    wanixtermscreenwrite: (...args: unknown[]) => mockscreenwrite(...args),
  }
})

const mockattachedmode = jest.fn(() => false)

jest.mock('zss/feature/wanix/wanixterminalmode', () => {
  const actual = jest.requireActual('zss/feature/wanix/wanixterminalmode')
  return {
    ...actual,
    readterminalmodeattached: () => mockattachedmode(),
  }
})

import {
  resetwanixhostfortest,
  spawnwanixspace,
} from 'zss/feature/wanix/wanixiframehost'
import {
  registertask,
  resetwanixsessionfortest,
  setwanixattached,
} from 'zss/feature/wanix/wanixsession'

function dispatchtermout(chunk: string, taskid = 'demo-wasm') {
  window.dispatchEvent(
    new MessageEvent('message', {
      data: {
        type: 'wanix:term-out',
        chunk,
        taskId: taskid,
        attachKind: 'task',
        attachId: taskid,
      },
      origin: window.location.origin,
    }),
  )
}

describe('wanix:term-out routing', () => {
  const mount = document.createElement('div')
  mount.id = 'zss-wanix-display'

  beforeEach(() => {
    jest.clearAllMocks()
    resetwanixhostfortest()
    resetwanixsessionfortest()
    mockattachedmode.mockReturnValue(false)
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
  }

  it('writes to tile screen when attached mode is active', async () => {
    await wirehost()
    registertask({ id: 'demo-wasm', label: 'demo', entrycmd: 'demo.wasm' })
    setwanixattached('task', 'demo-wasm')
    mockattachedmode.mockReturnValue(true)

    dispatchtermout('hello')

    expect(mockscreenwrite).toHaveBeenCalledWith('hello')
  })

  it('drops guest output when not in attached terminal mode', async () => {
    await wirehost()
    registertask({ id: 'demo-wasm', label: 'demo', entrycmd: 'demo.wasm' })
    setwanixattached('task', 'demo-wasm')
    mockattachedmode.mockReturnValue(false)

    dispatchtermout('hello')

    expect(mockscreenwrite).not.toHaveBeenCalled()
  })
})
