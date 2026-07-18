jest.mock('zss/feature/netterminal', () => ({
  netterminalhalt: jest.fn(),
}))

jest.mock('zss/device/registerplayer', () => ({
  registerreadplayer: jest.fn(() => 'p1'),
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

jest.mock('zss/feature/contenturlflow', () => ({
  contenturldestinationfailed: jest.fn(),
}))

import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/types'
import { handlecontentcrosslogin } from 'zss/device/register/handlers/contentcrosslogin'
import { contenturldestinationfailed } from 'zss/feature/contenturlflow'
import {
  clearcrossloginflags,
  readcrossloginflags,
} from 'zss/feature/crosslogin'
import { netterminalhalt } from 'zss/feature/netterminal'

describe('handlecontentcrosslogin', () => {
  const originalfetch = global.fetch
  const assign = jest.fn()
  const store = new Map<string, string>()

  beforeAll(() => {
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value)
        },
        removeItem: (key: string) => {
          store.delete(key)
        },
      },
    })
    Object.defineProperty(globalThis, 'location', {
      configurable: true,
      value: { assign, href: 'https://zed.cafe/' },
    })
  })

  beforeEach(() => {
    store.clear()
    clearcrossloginflags()
    jest.clearAllMocks()
  })

  afterEach(() => {
    global.fetch = originalfetch
    clearcrossloginflags()
    store.clear()
  })

  it('assigns host content url after resolve', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        text: () =>
          Promise.resolve(
            `<script>location = 'https://zed.cafe/#payload';</script>`,
          ),
      } as Response),
    ) as typeof fetch

    const device = { emit: jest.fn() } as unknown as DEVICE
    handlecontentcrosslogin(device, {
      player: 'p1',
      data: {
        url: 'https://bytes.zed.cafe/abcd1234',
        flags: { health: 10 },
      },
    } as MESSAGE)

    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(netterminalhalt).toHaveBeenCalled()
    expect(readcrossloginflags()).toEqual({ health: 10 })
    expect(assign).toHaveBeenCalledWith('https://zed.cafe/#payload')
    expect(contenturldestinationfailed).not.toHaveBeenCalled()
  })

  it('does not assign join targets', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        text: () =>
          Promise.resolve(
            `<script>location = 'https://zed.cafe/join/#peer99';</script>`,
          ),
      } as Response),
    ) as typeof fetch

    const device = { emit: jest.fn() } as unknown as DEVICE
    handlecontentcrosslogin(device, {
      player: 'p1',
      data: {
        url: 'https://bytes.zed.cafe/abcd1234',
        flags: { health: 1 },
      },
    } as MESSAGE)

    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(assign).not.toHaveBeenCalled()
    expect(contenturldestinationfailed).toHaveBeenCalled()
    expect(readcrossloginflags()).toBeUndefined()
  })
})
