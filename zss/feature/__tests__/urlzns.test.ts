import {
  fetchznstext,
  znsdocsfetchenabled,
  znsnormalizenamespace,
  znstenanturl,
} from 'zss/feature/url'

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

describe('znsdocsfetchenabled', () => {
  const originalloc = global.location

  afterEach(() => {
    Object.defineProperty(global, 'location', {
      value: originalloc,
      writable: true,
      configurable: true,
    })
  })

  it('returns false on localhost', () => {
    Object.defineProperty(global, 'location', {
      value: { hostname: 'localhost' },
      writable: true,
      configurable: true,
    })
    expect(znsdocsfetchenabled()).toBe(false)
  })

  it('returns true on zed.cafe', () => {
    Object.defineProperty(global, 'location', {
      value: { hostname: 'zed.cafe' },
      writable: true,
      configurable: true,
    })
    expect(znsdocsfetchenabled()).toBe(true)
  })
})

describe('fetchznstext', () => {
  const originalfetch = global.fetch

  afterEach(() => {
    global.fetch = originalfetch
  })

  it('returns empty string when fetch throws', async () => {
    global.fetch = jest.fn(() =>
      Promise.reject(new TypeError('Failed to fetch')),
    ) as typeof fetch
    await expect(fetchznstext('docs', 'cliscroll')).resolves.toBe('')
  })

  it('returns empty string when response is not ok', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: false } as Response),
    ) as typeof fetch
    await expect(fetchznstext('docs', 'cliscroll')).resolves.toBe('')
  })

  it('returns response text when fetch succeeds', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        text: () => Promise.resolve('# doc'),
      } as Response),
    ) as typeof fetch
    await expect(fetchznstext('docs', 'cliscroll')).resolves.toBe('# doc')
  })
})
