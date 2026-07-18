const shorturl = jest.fn(() =>
  Promise.resolve('https://bytes.zed.cafe/abc123'),
)
const znsset = jest.fn(() => Promise.resolve({ success: true }))
const write = jest.fn()
const workstatus = jest.fn()

jest.mock('zss/feature/url', () => ({
  shorturl: (...args: unknown[]) => shorturl(...args),
  znsset: (...args: unknown[]) => znsset(...args),
}))

jest.mock('zss/feature/writeui', () => ({
  write: (...args: unknown[]) => write(...args),
}))

jest.mock('zss/feature/zsstextui', () => ({
  zssheaderlines: () => [],
  zssoptionline: (a: string, b: string) => `${a}${b}`,
  zsstextline: (text: string) => text,
}))

jest.mock('zss/feature/storage', () => ({
  storagenukecontent: jest.fn(),
  storagewritecontent: jest.fn(),
}))

jest.mock('zss/feature/itchiopublish', () => ({
  itchiopublish: jest.fn(),
}))

jest.mock('zss/device/api', () => ({
  workstatus: (...args: unknown[]) => workstatus(...args),
  apierror: jest.fn(),
}))

let pendingasync: Promise<void> | undefined

jest.mock('zss/device/doasync', () => ({
  doasync: (
    _device: unknown,
    _player: string,
    asyncfunc: () => Promise<void>,
  ) => {
    pendingasync = asyncfunc()
  },
}))

import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/types'
import { handlepublishmem } from 'zss/device/register/handlers/memory'

describe('handlepublishmem zns-bytes', () => {
  afterEach(() => {
    jest.clearAllMocks()
    pendingasync = undefined
  })

  it('shortens cafe page URL with compressed hash, not a worker js URL', async () => {
    ;(globalThis as { location?: { href: string } }).location = {
      href: 'https://zed.cafe/',
    }

    const device = { emit: jest.fn() } as unknown as DEVICE
    const compressed = 'compressedbookpayload'
    handlepublishmem(device, {
      player: 'player-a',
      data: [
        'zns-bytes',
        'user@example.com',
        'token',
        'mybook',
        compressed,
      ],
    } as MESSAGE)
    await pendingasync

    expect(shorturl).toHaveBeenCalledTimes(1)
    const longurl = shorturl.mock.calls[0][0] as string
    expect(longurl).toMatch(/^https:\/\/zed\.cafe\/#/)
    expect(longurl).toContain(compressed)
    expect(longurl).not.toMatch(/\.js(?:\?|#|$)/)

    expect(znsset).toHaveBeenCalledWith(
      'user@example.com',
      'token',
      'mybook',
      'https://bytes.zed.cafe/abc123',
    )
    expect(write).toHaveBeenCalledWith(
      device,
      'player-a',
      expect.stringContaining('https://bytes.zed.cafe/abc123'),
    )
  })
})
