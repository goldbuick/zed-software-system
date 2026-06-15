import { createmessage } from 'zss/device'
import { hub } from 'zss/hub'

const stopmock = jest.fn()
const replacemock = jest.fn()
const keepmock = jest.fn()
const statusmock = jest.fn()
const activemock = jest.fn(() => false)
const terminalmock = jest.fn()

jest.mock('zss/device/register', () => ({
  registerreadplayer: () => 'player1',
}))

jest.mock('zss/feature/wanix/wanixdrop', () => ({
  wanixhandlestop: (...args: unknown[]) => stopmock(...args),
  wanixhandlereplace: (...args: unknown[]) => replacemock(...args),
  wanixhandlekeep: (...args: unknown[]) => keepmock(...args),
}))

jest.mock('zss/feature/wanix/wanixiframehost', () => ({
  readwanixstatus: (...args: unknown[]) => statusmock(...args),
  iswanixspaceactive: () => activemock(),
}))

jest.mock('zss/feature/terminalwritelines', () => ({
  terminalwritelines: (...args: unknown[]) => terminalmock(...args),
}))

describe('wanix device', () => {
  beforeAll(async () => {
    await import('zss/device/wanix')
    hub.invoke(createmessage('sess', '', 'platform', 'ready'))
  })

  beforeEach(() => {
    jest.clearAllMocks()
    activemock.mockReturnValue(false)
    statusmock.mockResolvedValue({
      active: false,
      ready: false,
      state: 'idle',
    })
  })

  function invoke(target: string, data?: unknown) {
    hub.invoke(
      createmessage('sess', 'player1', 'SOFTWARE', `wanix:${target}`, data),
    )
  }

  it('routes stop to wanixhandlestop', async () => {
    invoke('stop')
    await new Promise((r) => setTimeout(r, 0))
    expect(stopmock).toHaveBeenCalledTimes(1)
  })

  it('routes replace to wanixhandlereplace', async () => {
    invoke('replace')
    await new Promise((r) => setTimeout(r, 0))
    expect(replacemock).toHaveBeenCalledTimes(1)
  })

  it('routes keep to wanixhandlekeep', async () => {
    invoke('keep')
    await new Promise((r) => setTimeout(r, 0))
    expect(keepmock).toHaveBeenCalledTimes(1)
  })

  it('show prints session status', async () => {
    invoke('show')
    await new Promise((r) => setTimeout(r, 0))
    expect(statusmock).toHaveBeenCalledTimes(1)
    expect(terminalmock).toHaveBeenCalled()
  })
})
