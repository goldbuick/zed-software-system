const ensuremock = jest.fn()
const putmock = jest.fn()
const spawnmock = jest.fn()
const bindsmock = jest.fn()
const terminalmock = jest.fn()

jest.mock('zss/feature/wanix/wanixhost', () => ({
  ensurewanixsandbox: (...args: unknown[]) => ensuremock(...args),
  putwanixfile: (...args: unknown[]) => putmock(...args),
  mountwanixarchive: jest.fn(),
  listwanixdir: jest.fn(),
  spawnwanixtask: (...args: unknown[]) => spawnmock(...args),
  setwanixtaskexithandler: jest.fn(),
  listwanixbinds: (...args: unknown[]) => bindsmock(...args),
  iswanixspaceactive: () => false,
}))

jest.mock('zss/feature/terminalwritelines', () => ({
  terminalwritelines: (...args: unknown[]) => terminalmock(...args),
}))

import {
  wanixhandledrop,
  wanixhandleshownenu,
} from 'zss/feature/wanix/wanixdrop'
import {
  readwanixattached,
  readwanixtasks,
  resetwanixsessionfortest,
} from 'zss/feature/wanix/wanixsession'

describe('wanixhandledrop', () => {
  const device = { emit: jest.fn() }
  const player = 'player1'

  beforeEach(() => {
    jest.clearAllMocks()
    resetwanixsessionfortest()
    ensuremock.mockResolvedValue(undefined)
    putmock.mockResolvedValue(undefined)
    spawnmock.mockImplementation(async () => {
      const { setwanixattached } = await import('zss/feature/wanix/wanixsession')
      setwanixattached('task', 'demo-wasm')
      return { taskid: 'demo-wasm' }
    })
    bindsmock.mockResolvedValue([])
  })

  it('launches wasm without blocking on exit', async () => {
    await wanixhandledrop(
      device,
      player,
      'demo.wasm',
      'wasm',
      new Uint8Array([0, 97, 115, 109]),
    )
    expect(ensuremock).toHaveBeenCalled()
    expect(putmock).toHaveBeenCalledWith('demo.wasm', expect.any(Uint8Array))
    expect(spawnmock).toHaveBeenCalledWith(
      'demo.wasm',
      expect.objectContaining({ taskid: 'demo-wasm', wait: false, attach: true }),
    )
    expect(readwanixtasks()).toHaveLength(1)
    expect(readwanixattached()).toBe('demo-wasm')
  })

  it('allows parallel drops while a task is running', async () => {
    await wanixhandledrop(device, player, 'a.wasm', 'wasm', new Uint8Array())
    spawnmock.mockResolvedValueOnce({ taskid: 'b-wasm' })
    await wanixhandledrop(device, player, 'b.wasm', 'wasm', new Uint8Array())
    expect(spawnmock).toHaveBeenCalledTimes(2)
    expect(readwanixtasks()).toHaveLength(2)
  })
})

describe('wanixhandleshownenu', () => {
  const device = { emit: jest.fn() }
  const player = 'player1'

  beforeEach(() => {
    jest.clearAllMocks()
    resetwanixsessionfortest()
    bindsmock.mockResolvedValue([])
  })

  it('renders task, vm, and bind sections', async () => {
    const { registertask, registervm } = await import('zss/feature/wanix/wanixsession')
    registertask({ id: 'hello-wasm', label: 'hello.wasm', entrycmd: 'hello.wasm' })
    registervm({ id: 'linux-vm', label: 'linux-vm', mem: '512M' })
    await wanixhandleshownenu(device, player)
    expect(terminalmock).toHaveBeenCalled()
    const tape = String(terminalmock.mock.calls[0]?.[2] ?? '')
    expect(tape).toContain('Tasks')
    expect(tape).toContain('VMs')
    expect(tape).toContain('Binds')
    expect(tape).toContain('wanix attach hello-wasm')
    expect(tape).toContain('wanix stop hello-wasm')
    expect(tape).toContain('wanix attach linux-vm')
    expect(tape).toContain('wanix vm stop linux-vm')
    expect(tape).toContain('Stop all (1 tasks)')
    expect(tape).toContain('Stop all (1 vms)')
  })

  it('shows boot vm link when no vms running', async () => {
    await wanixhandleshownenu(device, player)
    const tape = String(terminalmock.mock.calls[0]?.[2] ?? '')
    expect(tape).toContain('wanix vm')
    expect(tape).toContain('Boot Linux in v86')
  })
})
