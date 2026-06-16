import { claimdeeplink, clearqueryparams } from 'zss/feature/deeplink'

describe('clearqueryparams', () => {
  let href = 'https://zed.cafe/?foo=bar#hash'

  beforeEach(() => {
    href = 'https://zed.cafe/?foo=bar#hash'
    Object.defineProperty(globalThis, 'location', {
      configurable: true,
      get() {
        return new URL(href)
      },
    })
    Object.defineProperty(globalThis, 'history', {
      configurable: true,
      value: {
        replaceState(
          _state: unknown,
          _title: string,
          next?: string | URL | null,
        ) {
          const raw = String(next ?? href)
          href = raw.startsWith('http')
            ? raw
            : `https://zed.cafe${raw.startsWith('/') ? '' : '/'}${raw}`
        },
      },
    })
  })

  it('removes only the requested keys', () => {
    href = 'https://zed.cafe/?alpha=1&beta=2&foo=bar'
    clearqueryparams(['alpha', 'beta'])
    const url = new URL(href)
    expect(url.searchParams.get('foo')).toBe('bar')
    expect(url.searchParams.has('alpha')).toBe(false)
    expect(url.searchParams.has('beta')).toBe(false)
  })
})

describe('claimdeeplink', () => {
  const storage = new Map<string, string>()

  beforeEach(() => {
    storage.clear()
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: {
        getItem(key: string) {
          return storage.get(key) ?? null
        },
        setItem(key: string, value: string) {
          storage.set(key, value)
        },
      },
    })
  })

  it('allows the first claim and blocks duplicates', () => {
    expect(claimdeeplink('test', 'abc')).toBe(true)
    expect(claimdeeplink('test', 'abc')).toBe(false)
    expect(claimdeeplink('test', 'xyz')).toBe(true)
  })
})

describe('rundeeplinks', () => {
  let href = 'https://zed.cafe/'
  const storage = new Map<string, string>()
  let runcount = 0

  function installbrowsermocks() {
    Object.defineProperty(globalThis, 'location', {
      configurable: true,
      get() {
        return new URL(href)
      },
    })
    Object.defineProperty(globalThis, 'history', {
      configurable: true,
      value: {
        replaceState(
          _state: unknown,
          _title: string,
          next?: string | URL | null,
        ) {
          const raw = String(next ?? href)
          href = raw.startsWith('http')
            ? raw
            : `https://zed.cafe${raw.startsWith('/') ? '' : '/'}${raw}`
        },
      },
    })
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: {
        getItem(key: string) {
          return storage.get(key) ?? null
        },
        setItem(key: string, value: string) {
          storage.set(key, value)
        },
      },
    })
  }

  beforeEach(async () => {
    jest.resetModules()
    href = 'https://zed.cafe/?magic=1'
    runcount = 0
    storage.clear()
    installbrowsermocks()
    const { registerdeeplink } = await import('zss/feature/deeplink')
    registerdeeplink({
      id: 'test-magic',
      paramkeys: ['magic'],
      match() {
        return href.includes('magic=1')
      },
      readdata() {
        return { magic: '1' }
      },
      fingerprint(data) {
        return (data as { magic: string }).magic
      },
      run() {
        runcount += 1
        return Promise.resolve(true)
      },
    })
  })

  it('dispatches a matching handler and clears params', async () => {
    const { rundeeplinks } = await import('zss/feature/deeplink')
    const handled = await rundeeplinks({ player: 'p1', surface: 'menu' })
    expect(handled).toBe(true)
    expect(runcount).toBe(1)
    expect(new URL(href).searchParams.has('magic')).toBe(false)
  })

  it('does not run the handler twice for the same fingerprint', async () => {
    const { rundeeplinks } = await import('zss/feature/deeplink')
    await rundeeplinks({ player: 'p1', surface: 'menu' })
    href = 'https://zed.cafe/?magic=1'
    const handled = await rundeeplinks({ player: 'p1', surface: 'cli' })
    expect(handled).toBe(false)
    expect(runcount).toBe(1)
  })
})
