import { createmessage } from 'zss/device'
import { hub } from 'zss/hub'

const dropmock = jest.fn()
const stopmock = jest.fn()
const replacemock = jest.fn()
const keepmock = jest.fn()
const stdinmock = jest.fn()
const detachmock = jest.fn()
const attachmock = jest.fn()
const statusmock = jest.fn()
const activemock = jest.fn(() => false)
const terminalmock = jest.fn()

jest.mock('zss/device/register', () => ({
  registerreadplayer: () => 'player1',
}))

jest.mock('zss/feature/wanix/wanixdrop', () => ({
  wanixhandledrop: (...args: unknown[]) => dropmock(...args),
  wanixhandlestop: (...args: unknown[]) => stopmock(...args),
  wanixhandlereplace: (...args: unknown[]) => replacemock(...args),
  wanixhandlekeep: (...args: unknown[]) => keepmock(...args),
  wanixhandlestdin: (...args: unknown[]) => stdinmock(...args),
  wanixhandledetach: (...args: unknown[]) => detachmock(...args),
  wanixhandleattach: (...args: unknown[]) => attachmock(...args),
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

  it('routes drop to wanixhandledrop', async () => {
    const bytes = new Uint8Array([0, 97, 115, 109])
    invoke('drop', { label: 'demo.wasm', kind: 'wasm', bytes })
    await new Promise((r) => setTimeout(r, 0))
    expect(dropmock).toHaveBeenCalledWith(
      expect.anything(),
      'player1',
      'demo.wasm',
      'wasm',
      bytes,
    )
  })

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

  it('routes stdin to wanixhandlestdin', async () => {
    invoke('stdin', 'hello')
    await new Promise((r) => setTimeout(r, 0))
    expect(stdinmock).toHaveBeenCalledTimes(1)
  })

  it('routes detach to wanixhandledetach', async () => {
    invoke('detach')
    await new Promise((r) => setTimeout(r, 0))
    expect(detachmock).toHaveBeenCalledTimes(1)
  })

  it('routes attach to wanixhandleattach', async () => {
    invoke('attach')
    await new Promise((r) => setTimeout(r, 0))
    expect(attachmock).toHaveBeenCalledTimes(1)
  })

  it('show prints session status', async () => {
    invoke('show')
    await new Promise((r) => setTimeout(r, 0))
    expect(statusmock).toHaveBeenCalledTimes(1)
    expect(terminalmock).toHaveBeenCalled()
  })
})
