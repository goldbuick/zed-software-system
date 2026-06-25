import { znsnormalizenamespace, znsread, znstenanturl } from 'zss/feature/url'

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
