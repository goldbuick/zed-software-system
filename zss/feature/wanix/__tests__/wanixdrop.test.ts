const ensuremock = jest.fn()
const putmock = jest.fn()
const runmock = jest.fn()
const terminalmock = jest.fn()
const hyperlinkmock = jest.fn()

jest.mock('zss/feature/wanix/wanixiframehost', () => ({
  ensurewanixsandbox: (...args: unknown[]) => ensuremock(...args),
  putwanixfile: (...args: unknown[]) => putmock(...args),
  mountwanixarchive: jest.fn(),
  listwanixdir: jest.fn(),
  runwanixcommand: (...args: unknown[]) => runmock(...args),
  haltwanixtask: jest.fn(),
  iswanixspaceactive: () => false,
}))

jest.mock('zss/feature/terminalwritelines', () => ({
  terminalwritelines: (...args: unknown[]) => terminalmock(...args),
}))

jest.mock('zss/feature/writeui', () => ({
  writehyperlink: (...args: unknown[]) => hyperlinkmock(...args),
}))

jest.mock('zss/feature/wanix/wanixiobridge', () => ({
  wanixiobridgeflush: jest.fn(),
}))

import { wanixhandledrop } from 'zss/feature/wanix/wanixdrop'
import {
  readwanixpending,
  readwanixphase,
  resetwanixsessionfortest,
  setwanixrunning,
} from 'zss/feature/wanix/wanixsession'

describe('wanixhandledrop', () => {
  const device = { emit: jest.fn() }
  const player = 'player1'

  beforeEach(() => {
    jest.clearAllMocks()
    resetwanixsessionfortest()
    ensuremock.mockResolvedValue(undefined)
    putmock.mockResolvedValue(undefined)
    runmock.mockResolvedValue(0)
  })

  it('launches wasm when idle', async () => {
    await wanixhandledrop(
      device,
      player,
      'demo.wasm',
      'wasm',
      new Uint8Array([0, 97, 115, 109]),
    )
    expect(ensuremock).toHaveBeenCalled()
    expect(putmock).toHaveBeenCalledWith('demo.wasm', expect.any(Uint8Array))
    expect(runmock).toHaveBeenCalledWith('demo.wasm')
    expect(readwanixphase()).toBe('stopped')
  })

  it('stash pending and prompts when running', async () => {
    setwanixrunning({ label: 'run.wasm', entrycmd: 'run.wasm' })
    await wanixhandledrop(device, player, 'next.wasm', 'wasm', new Uint8Array())
    expect(readwanixpending()?.label).toBe('next.wasm')
    expect(putmock).not.toHaveBeenCalled()
    expect(terminalmock).toHaveBeenCalled()
    expect(hyperlinkmock).toHaveBeenCalledWith(
      device,
      player,
      'wanix replace',
      'Replace with next.wasm',
    )
    expect(hyperlinkmock).toHaveBeenCalledWith(
      device,
      player,
      'wanix keep',
      'Keep run.wasm',
    )
  })
})
