import { apilog, wanixserverhalttask, wanixserverspawntask } from 'zss/device/api'
import {
  cancelzedsyncreadywait,
  iszedsyncreadywaitpending,
  startwanixzedsync,
} from 'zss/device/wanixclient/wanixzedsync'
import {
  resetwanixzedcafesessionfortest,
  setwanixroomconfig,
} from 'zss/device/wanixclient/state'
import { createidleroomconfig } from 'zss/feature/wanix/wanixroomtypes'

jest.mock('zss/device/api', () => ({
  apilog: jest.fn(),
  wanixserverapplyroom: jest.fn(),
  wanixserverhalttask: jest.fn(),
  wanixserverreadfile: jest.fn(),
  wanixserverreadvmstatus: jest.fn(),
  wanixserverspawntask: jest.fn(),
  wanixserverstopvm: jest.fn(),
  wanixserverwritefile: jest.fn(),
  wanixserverbinddrop: jest.fn(),
}))

jest.mock('zss/device/registerplayer', () => ({
  registerreadplayer: () => 'test-player',
}))

jest.mock('zss/device/wanixclient/wanixactivateexport', () => ({
  activatewanixzedcafeexport: jest.fn(),
}))

jest.mock('zss/device/wanixclient/wanixzedcafe', () => ({
  iswanixspaceactive: jest.fn(() => true),
  readwanixbootzedcafestate: () => ({
    cmd: 'zedcafe.wasm',
    generation: 1,
  }),
  resetwanixzedcafeonidle: jest.fn(),
  startzedcafepoll: jest.fn(),
  stopzedcafepoll: jest.fn(),
}))

const mockapilog = apilog as jest.Mock
const mockspawntask = wanixserverspawntask as jest.Mock
const mockhalttask = wanixserverhalttask as jest.Mock

const device = { id: 'dev', emit: jest.fn() } as never
const player = 'p1'

describe('startwanixzedsync gates', () => {
  beforeEach(() => {
    resetwanixzedcafesessionfortest()
    cancelzedsyncreadywait()
    mockapilog.mockClear()
    mockspawntask.mockClear()
    mockhalttask.mockClear()
    setwanixroomconfig(createidleroomconfig())
    global.fetch = jest.fn() as unknown as typeof fetch
    const { iswanixspaceactive } = jest.requireMock(
      'zss/device/wanixclient/wanixzedcafe',
    ) as { iswanixspaceactive: jest.Mock }
    iswanixspaceactive.mockReturnValue(true)
  })

  afterEach(() => {
    cancelzedsyncreadywait()
  })

  it('rejects empty targetpath', async () => {
    await expect(startwanixzedsync(device, player, '  ')).rejects.toThrow(
      /usage: #wanix zedsync/,
    )
    expect(mockspawntask).not.toHaveBeenCalled()
  })

  it('rejects spaces in targetpath', async () => {
    await expect(
      startwanixzedsync(device, player, 'my folder'),
    ).rejects.toThrow(/must not contain spaces/)
    expect(mockspawntask).not.toHaveBeenCalled()
  })

  it('rejects zedcafe as targetpath', async () => {
    await expect(startwanixzedsync(device, player, 'zedcafe')).rejects.toThrow(
      /must not be zedcafe/,
    )
    expect(mockspawntask).not.toHaveBeenCalled()
  })

  it('rejects when wanix room is not active', async () => {
    const { iswanixspaceactive } = await import(
      'zss/device/wanixclient/wanixzedcafe'
    )
    ;(iswanixspaceactive as jest.Mock).mockReturnValue(false)
    setwanixroomconfig({
      ...createidleroomconfig(),
      mode: 'task',
      zedcafe: { cmd: 'zedcafe.wasm', generation: 1 },
    })
    await expect(startwanixzedsync(device, player, 'MyFolder')).rejects.toThrow(
      /wanix room not active/,
    )
    expect(mockspawntask).not.toHaveBeenCalled()
  })

  it('spawns for any peer path without a remotes list entry', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
    })
    setwanixroomconfig({
      ...createidleroomconfig(),
      mode: 'task',
      remotes: [],
      zedcafe: { cmd: 'zedcafe.wasm', generation: 1 },
    })
    await startwanixzedsync(device, player, 'MyFolder')
    expect(mockspawntask).toHaveBeenCalled()
    expect(iszedsyncreadywaitpending()).toBe(true)
    expect(mockapilog).toHaveBeenCalledWith(
      device,
      player,
      expect.stringContaining('spawned; waiting for MyFolder/.zedsync-ready'),
    )
    cancelzedsyncreadywait('test cleanup')
    expect(iszedsyncreadywaitpending()).toBe(false)
  })

  it('spawns when a remote dst is the peer path', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
    })
    setwanixroomconfig({
      ...createidleroomconfig(),
      mode: 'task',
      remotes: [
        { id: 'remote-remote', dst: 'remote', url: 'wss://localhost:8765/' },
      ],
      zedcafe: { cmd: 'zedcafe.wasm', generation: 1 },
    })
    await startwanixzedsync(device, player, 'remote')
    expect(mockspawntask).toHaveBeenCalled()
    expect(iszedsyncreadywaitpending()).toBe(true)
    expect(mockapilog).toHaveBeenCalledWith(
      device,
      player,
      expect.stringContaining('spawned; waiting for remote/.zedsync-ready'),
    )
    cancelzedsyncreadywait('test cleanup')
    expect(iszedsyncreadywaitpending()).toBe(false)
  })
})
