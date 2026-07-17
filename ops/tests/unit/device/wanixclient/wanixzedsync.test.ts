import {
  apilog,
  wanixserverapplyroom,
  wanixserverhalttask,
  wanixserverspawntask,
  wanixserverwritefile,
} from 'zss/device/api'
import {
  beginzedsyncreadywait,
  cancelzedsyncreadywait,
  iszedsyncreadywaitpending,
  startwanixzedsync,
  WANIX_ZEDSYNC_WASM_URL,
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
const mockapplyroom = wanixserverapplyroom as jest.Mock
const mockwritefile = wanixserverwritefile as jest.Mock

const device = { id: 'dev', emit: jest.fn() } as never
const player = 'p1'

describe('startwanixzedsync gates', () => {
  beforeEach(() => {
    resetwanixzedcafesessionfortest()
    cancelzedsyncreadywait()
    mockapilog.mockClear()
    mockspawntask.mockClear()
    mockhalttask.mockClear()
    mockapplyroom.mockClear()
    mockwritefile.mockClear()
    setwanixroomconfig(createidleroomconfig())
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

  it('emits spawn with stageurl and does not start ready wait yet', async () => {
    setwanixroomconfig(createidleroomconfig())
    await startwanixzedsync(device, player, 'MyFolder')
    expect(mockapplyroom).not.toHaveBeenCalled()
    expect(mockwritefile).not.toHaveBeenCalled()
    expect(mockspawntask).toHaveBeenCalledWith(
      expect.anything(),
      'test-player',
      'zedsync',
      'zedsync.wasm MyFolder',
      'gojs',
      WANIX_ZEDSYNC_WASM_URL,
    )
    expect(iszedsyncreadywaitpending()).toBe(false)
    expect(mockapilog).toHaveBeenCalledWith(
      device,
      player,
      expect.stringContaining('spawning guest'),
    )
  })

  it('beginzedsyncreadywait polls for the sentinel on main', () => {
    beginzedsyncreadywait(device, player, 'MyFolder')
    expect(iszedsyncreadywaitpending()).toBe(true)
    expect(mockapilog).toHaveBeenCalledWith(
      device,
      player,
      expect.stringContaining('spawned; waiting for MyFolder/.zedsync-ready'),
    )
    cancelzedsyncreadywait('test cleanup')
    expect(iszedsyncreadywaitpending()).toBe(false)
  })
})
