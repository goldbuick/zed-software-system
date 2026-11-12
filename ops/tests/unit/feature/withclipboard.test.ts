import {
  resetmemoryclipboardfortest,
  withclipboard,
} from 'zss/feature/keyboard'

describe('withclipboard memory fallback', () => {
  const hadnavigator = 'navigator' in globalThis
  const priornavigator = globalThis.navigator

  afterEach(() => {
    resetmemoryclipboardfortest()
    if (hadnavigator) {
      Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: priornavigator,
      })
    } else {
      Reflect.deleteProperty(globalThis, 'navigator')
    }
  })

  it('resolves write when OS writeText rejects and read returns memory', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        clipboard: {
          writeText: () =>
            Promise.reject(new Error('NotAllowedError: permission denied')),
          readText: () =>
            Promise.reject(new Error('NotAllowedError: permission denied')),
        },
      },
    })

    const clipboard = withclipboard()
    expect(clipboard).toBeDefined()
    await expect(clipboard!.writeText('hello from editor')).resolves.toBeUndefined()
    await expect(clipboard!.readText()).resolves.toBe('hello from editor')
  })

  it('returns memory when OS clipboard is missing', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {},
    })

    const clipboard = withclipboard()
    await clipboard!.writeText('memory only')
    await expect(clipboard!.readText()).resolves.toBe('memory only')
  })

  it('mirrors memory on successful OS write', async () => {
    const written: string[] = []
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        clipboard: {
          writeText: (text: string) => {
            written.push(text)
            return Promise.resolve()
          },
          readText: () =>
            Promise.reject(new Error('NotAllowedError: permission denied')),
        },
      },
    })

    const clipboard = withclipboard()
    await clipboard!.writeText('synced')
    expect(written).toEqual(['synced'])
    await expect(clipboard!.readText()).resolves.toBe('synced')
  })
})
