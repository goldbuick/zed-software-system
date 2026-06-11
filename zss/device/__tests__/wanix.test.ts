import { createmessage } from 'zss/device'
import { hub } from 'zss/hub'

const spawnmock = jest.fn()
const haltmock = jest.fn()
const runmock = jest.fn()
const statusmock = jest.fn()
const activemock = jest.fn(() => false)

jest.mock('zss/device/register', () => ({
  registerreadplayer: () => 'player1',
}))

jest.mock('zss/feature/wanix/wanixiframehost', () => ({
  spawnwanixspace: (...args: unknown[]) => spawnmock(...args),
  haltwanixspace: (...args: unknown[]) => haltmock(...args),
  runwanixcommand: (...args: unknown[]) => runmock(...args),
  readwanixstatus: (...args: unknown[]) => statusmock(...args),
  readwanixhoststate: () => 'idle',
  iswanixspaceactive: () => activemock(),
}))

describe('wanix device', () => {
  beforeAll(async () => {
    await import('zss/device/wanix')
    hub.invoke(createmessage('sess', '', 'platform', 'ready'))
  })

  beforeEach(() => {
    jest.clearAllMocks()
    activemock.mockReturnValue(false)
    spawnmock.mockResolvedValue(undefined)
    haltmock.mockResolvedValue(undefined)
    runmock.mockResolvedValue(0)
    statusmock.mockResolvedValue({ active: false, ready: false, state: 'idle' })
  })

  function invoke(target: string, data?: unknown) {
    hub.invoke(
      createmessage('sess', 'player1', 'SOFTWARE', `wanix:${target}`, data),
    )
  }

  it('starts wanixspace when idle', async () => {
    invoke('start')
    await new Promise((r) => setTimeout(r, 0))
    expect(spawnmock).toHaveBeenCalledTimes(1)
  })

  it('rejects duplicate start when already active', async () => {
    activemock.mockReturnValue(true)
    const error = jest.spyOn(console, 'error').mockImplementation(() => {})
    invoke('start')
    await new Promise((r) => setTimeout(r, 0))
    expect(spawnmock).not.toHaveBeenCalled()
    error.mockRestore()
  })

  it('runs a command string', async () => {
    invoke('run', 'hello.wasm')
    await new Promise((r) => setTimeout(r, 0))
    expect(runmock).toHaveBeenCalledWith('hello.wasm')
  })

  it('stops wanixspace', async () => {
    invoke('stop')
    await new Promise((r) => setTimeout(r, 0))
    expect(haltmock).toHaveBeenCalledTimes(1)
  })
})
