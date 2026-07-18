import {
  znsisauthed,
  znsnormalizenamespace,
  znsread,
  znsset,
  znstenanturl,
} from 'zss/feature/url'
import {
  storageclearznstoken,
  storagereadznssession,
} from 'zss/feature/storage'

jest.mock('zss/feature/storage', () => {
  const actual = jest.requireActual('zss/feature/storage')
  return {
    ...actual,
    storageclearznstoken: jest.fn(() => Promise.resolve()),
    storagereadznssession: jest.fn(() => Promise.resolve(undefined)),
  }
})

describe('znsnormalizenamespace', () => {
  it('trims and lowercases namespace labels', () => {
    expect(znsnormalizenamespace(' WiL ')).toBe('wil')
  })
})

describe('znstenanturl', () => {
  it('builds lowercase tenant hostnames', () => {
    expect(znstenanturl('WiL', 'home')).toBe('https://wil.at.zed.cafe/home')
  })
})

describe('znsread', () => {
  const originalfetch = global.fetch

  afterEach(() => {
    global.fetch = originalfetch
  })

  it('returns empty object when fetch throws', async () => {
    global.fetch = jest.fn(() =>
      Promise.reject(new TypeError('Failed to fetch')),
    ) as typeof fetch
    await expect(znsread('docs', 'cliscroll')).resolves.toEqual({})
  })

  it('returns empty object when response is not ok', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ message: 'not found' }),
      } as Response),
    ) as typeof fetch
    await expect(znsread('docs', 'cliscroll')).resolves.toEqual({})
  })

  it('returns row when fetch succeeds', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            key: 'cliscroll',
            value: '# doc',
            metadata: { kind: 'text' },
          }),
      } as Response),
    ) as typeof fetch
    await expect(znsread('docs', 'cliscroll')).resolves.toEqual({
      success: true,
      key: 'cliscroll',
      value: '# doc',
      metadata: { kind: 'text' },
    })
  })
})

describe('znsset auth', () => {
  const originalfetch = global.fetch

  beforeEach(() => {
    jest.mocked(storageclearznstoken).mockClear()
    jest.mocked(storagereadznssession).mockReset()
  })

  afterEach(() => {
    global.fetch = originalfetch
  })

  it('znsisauthed is false without session', async () => {
    jest.mocked(storagereadznssession).mockResolvedValue(undefined)
    await expect(znsisauthed()).resolves.toBe(false)
  })

  it('znsisauthed is true with session', async () => {
    jest.mocked(storagereadznssession).mockResolvedValue({
      email: 'a@b.c',
      token: 'tok',
      namespace: 'wil',
    })
    await expect(znsisauthed()).resolves.toBe(true)
  })

  it('does not fetch when token is missing', async () => {
    const fetchmock = jest.fn()
    global.fetch = fetchmock as typeof fetch
    await expect(znsset('a@b.c', '', 'peer', 'id1')).resolves.toEqual({
      success: false,
    })
    expect(fetchmock).not.toHaveBeenCalled()
  })

  it('clears token on 403', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        status: 403,
        ok: false,
        json: () => Promise.resolve({ message: 'forbidden' }),
      } as Response),
    ) as typeof fetch
    await expect(znsset('a@b.c', 'stale', 'peer', 'id1')).resolves.toEqual({
      success: false,
    })
    expect(storageclearznstoken).toHaveBeenCalledTimes(1)
  })

  it('returns json on success', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        status: 200,
        ok: true,
        json: () => Promise.resolve({ success: true }),
      } as Response),
    ) as typeof fetch
    await expect(znsset('a@b.c', 'tok', 'peer', 'id1')).resolves.toEqual({
      success: true,
    })
    expect(storageclearznstoken).not.toHaveBeenCalled()
  })
})
