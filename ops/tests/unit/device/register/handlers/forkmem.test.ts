const isjoin = jest.fn(() => false)
const contenttohashfragment = jest.fn((compressed: string) =>
  Promise.resolve(`shortidfor${compressed.slice(0, 8)}`),
)

jest.mock('zss/feature/url', () => ({
  isjoin: (...args: unknown[]) => isjoin(...args),
  shorturl: jest.fn(),
  znsset: jest.fn(),
}))

jest.mock('zss/feature/storage', () => ({
  contenttohashfragment: (...args: unknown[]) =>
    contenttohashfragment(...(args as [string])),
  storagenukecontent: jest.fn(),
  storagewritecontent: jest.fn(),
}))

jest.mock('zss/feature/writeui', () => ({
  write: jest.fn(),
}))

jest.mock('zss/feature/zsstextui', () => ({
  zssheaderlines: () => [],
  zssoptionline: (a: string, b: string) => `${a}${b}`,
  zsstextline: (text: string) => text,
}))

jest.mock('zss/feature/itchiopublish', () => ({
  itchiopublish: jest.fn(),
}))

jest.mock('zss/device/api', () => ({
  workstatus: jest.fn(),
  apierror: jest.fn(),
}))

jest.mock('zss/device/doasync', () => ({
  doasync: (
    _device: unknown,
    _player: string,
    asyncfunc: () => Promise<void>,
  ) => {
    void asyncfunc()
  },
}))

import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/types'
import { handleforkmem } from 'zss/device/register/handlers/memory'

describe('handleforkmem', () => {
  const open = jest.fn()

  beforeEach(() => {
    open.mockReset()
    contenttohashfragment.mockClear()
    isjoin.mockReturnValue(false)
    ;(globalThis as { window?: { open: typeof open } }).window = { open }
    ;(globalThis as { location?: { href: string; origin: string } }).location =
      {
        href: 'https://zed.cafe/#oldhash',
        origin: 'https://zed.cafe',
      }
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('opens full compressed content in hash, never a local short-id', () => {
    // Longer than the 2048 short-id threshold used by contenttohashfragment.
    const compressed = `zippayload${'x'.repeat(2100)}`
    const device = { emit: jest.fn() } as unknown as DEVICE

    handleforkmem(device, {
      player: 'operator',
      data: [compressed, ''],
    } as MESSAGE)

    expect(contenttohashfragment).not.toHaveBeenCalled()
    expect(open).toHaveBeenCalledTimes(1)
    const url = open.mock.calls[0][0] as string
    expect(url).toBe(`https://zed.cafe/#${compressed}`)
    expect(url).toContain(compressed)
    expect(url).not.toMatch(/#shortidfor/)
  })

  it('on join tabs opens origin with full content, not /join/#', () => {
    isjoin.mockReturnValue(true)
    ;(globalThis as { location?: { href: string; origin: string } }).location =
      {
        href: 'https://zed.cafe/join/#peerid',
        origin: 'https://zed.cafe',
      }
    const compressed = `joinpayload${'y'.repeat(2100)}`
    const device = { emit: jest.fn() } as unknown as DEVICE

    handleforkmem(device, {
      player: 'joiner',
      data: [compressed, ''],
    } as MESSAGE)

    expect(contenttohashfragment).not.toHaveBeenCalled()
    const url = open.mock.calls[0][0] as string
    expect(url).toBe(`https://zed.cafe/#${compressed}`)
    expect(url).not.toContain('/join/')
  })

  it('uses address host when provided, still with full content', () => {
    const compressed = `addrpayload${'z'.repeat(2100)}`
    const device = { emit: jest.fn() } as unknown as DEVICE

    handleforkmem(device, {
      player: 'operator',
      data: [compressed, 'example.com'],
    } as MESSAGE)

    expect(contenttohashfragment).not.toHaveBeenCalled()
    expect(open.mock.calls[0][0]).toBe(`https://example.com/#${compressed}`)
  })
})
