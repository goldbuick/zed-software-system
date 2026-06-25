import { createmessage } from 'zss/device'
import { hub } from 'zss/hub'

const dropmock = jest.fn()
const bindscrollmock = jest.fn()
const stopmock = jest.fn()
const termwritemock = jest.fn()
const detachmock = jest.fn()
const attachmock = jest.fn()
const showmock = jest.fn()
const vmstartmock = jest.fn()
const vmstopmock = jest.fn()

jest.mock('zss/device/register', () => ({
  registerreadplayer: () => 'player1',
}))

jest.mock('zss/feature/wanix/wanixlaunch', () => ({
  wanixhandledrop: (...args: unknown[]) => dropmock(...args),
}))

jest.mock('zss/feature/wanix/wanixcommands', () => ({
  wanixhandlebindscroll: (...args: unknown[]) => bindscrollmock(...args),
  wanixhandlestop: (...args: unknown[]) => stopmock(...args),
  wanixhandletermwrite: (...args: unknown[]) => termwritemock(...args),
  wanixhandledetach: (...args: unknown[]) => detachmock(...args),
  wanixhandleattach: (...args: unknown[]) => attachmock(...args),
  wanixhandleshownenu: (...args: unknown[]) => showmock(...args),
  wanixhandlevmstart: (...args: unknown[]) => vmstartmock(...args),
  wanixhandlevmstop: (...args: unknown[]) => vmstopmock(...args),
}))

describe('wanix device', () => {
  beforeAll(async () => {
    await import('zss/device/wanix')
    hub.invoke(createmessage('sess', '', 'platform', 'ready'))
  })

  beforeEach(() => {
    jest.clearAllMocks()
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
    expect(stopmock).toHaveBeenCalledWith(
      expect.anything(),
      'player1',
      undefined,
    )
  })

  it('routes stop with task id', async () => {
    invoke('stop', 'hello-wasm')
    await new Promise((r) => setTimeout(r, 0))
    expect(stopmock).toHaveBeenCalledWith(
      expect.anything(),
      'player1',
      'hello-wasm',
    )
  })

  it('routes term-write to wanixhandletermwrite', async () => {
    invoke('term-write', 'hello')
    await new Promise((r) => setTimeout(r, 0))
    expect(termwritemock).toHaveBeenCalledTimes(1)
  })

  it('routes detach to wanixhandledetach', async () => {
    invoke('detach')
    await new Promise((r) => setTimeout(r, 0))
    expect(detachmock).toHaveBeenCalledTimes(1)
  })

  it('routes attach to wanixhandleattach', async () => {
    invoke('attach', 'hello-wasm')
    await new Promise((r) => setTimeout(r, 0))
    expect(attachmock).toHaveBeenCalledWith(
      expect.anything(),
      'player1',
      'hello-wasm',
    )
  })

  it('routes show and unbind-show to wanixhandleshownenu', async () => {
    invoke('show')
    await new Promise((r) => setTimeout(r, 0))
    expect(showmock).toHaveBeenCalledTimes(1)
    invoke('unbind-show')
    await new Promise((r) => setTimeout(r, 0))
    expect(showmock).toHaveBeenCalledTimes(2)
  })

  it('routes vm-start to wanixhandlevmstart', async () => {
    invoke('vm-start')
    await new Promise((r) => setTimeout(r, 0))
    expect(vmstartmock).toHaveBeenCalledWith(
      expect.anything(),
      'player1',
      undefined,
    )
  })

  it('routes bind-scroll to wanixhandlebindscroll', async () => {
    invoke('bind-scroll', {
      scrollname: 'wanixnotes',
      path: 'scroll-wanixnotes.txt',
      text: 'hello',
    })
    await new Promise((r) => setTimeout(r, 0))
    expect(bindscrollmock).toHaveBeenCalledWith(
      expect.anything(),
      'player1',
      {
        scrollname: 'wanixnotes',
        path: 'scroll-wanixnotes.txt',
        text: 'hello',
      },
    )
  })

  it('routes vm-stop with vm id', async () => {
    invoke('vm-stop', 'linux-vm')
    await new Promise((r) => setTimeout(r, 0))
    expect(vmstopmock).toHaveBeenCalledWith(
      expect.anything(),
      'player1',
      'linux-vm',
    )
  })
})
