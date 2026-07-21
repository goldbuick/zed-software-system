/**
 * @jest-environment jsdom
 */
import { apierror } from 'zss/device/api'

jest.mock('zss/device/api', () => ({
  apierror: jest.fn(),
}))

import {
  ensurewasmcoep,
  hashcoepswbody,
  resetwasmcoepfortest,
  setwasmcoepreloadfortest,
} from 'zss/feature/synth/backend/wasm/coopcoep'

const SW_URL = '/coep/enable-threads.js'
const SW_BODY = 'self.addEventListener("fetch", () => {});'

describe('ensurewasmcoep', () => {
  const originalisolated = Object.getOwnPropertyDescriptor(
    window,
    'crossOriginIsolated',
  )
  let reloadmock: jest.Mock
  let registermock: jest.Mock
  let fetchmock: jest.Mock
  let controller: ServiceWorker | null

  beforeEach(() => {
    resetwasmcoepfortest()
    localStorage.clear()
    ;(apierror as jest.Mock).mockReset()
    reloadmock = jest.fn()
    setwasmcoepreloadfortest(reloadmock)
    controller = null
    registermock = jest.fn()
    fetchmock = jest.fn(async () => ({
      ok: true,
      text: async () => SW_BODY,
    }))
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      writable: true,
      value: fetchmock,
    })
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        get controller() {
          return controller
        },
        register: registermock,
        ready: Promise.resolve({
          active: { scriptURL: `https://example.test${SW_URL}` },
        }),
        getRegistrations: jest.fn(async () => []),
      },
    })
  })

  afterEach(() => {
    if (originalisolated) {
      Object.defineProperty(window, 'crossOriginIsolated', originalisolated)
    } else {
      delete (window as { crossOriginIsolated?: boolean }).crossOriginIsolated
    }
  })

  it('hashcoepswbody is stable for the same body', () => {
    expect(hashcoepswbody(SW_BODY)).toBe(hashcoepswbody(SW_BODY))
    expect(hashcoepswbody(SW_BODY)).not.toBe(hashcoepswbody(`${SW_BODY}x`))
  })

  it('no-ops when already crossOriginIsolated', async () => {
    Object.defineProperty(window, 'crossOriginIsolated', {
      configurable: true,
      value: true,
    })
    await ensurewasmcoep()
    expect(registermock).not.toHaveBeenCalled()
    expect(reloadmock).not.toHaveBeenCalled()
  })

  it('does not reload when a controller already exists', async () => {
    Object.defineProperty(window, 'crossOriginIsolated', {
      configurable: true,
      value: false,
    })
    controller = { scriptURL: SW_URL } as ServiceWorker
    registermock.mockResolvedValue({})
    await ensurewasmcoep()
    expect(registermock).toHaveBeenCalledWith(SW_URL)
    expect(reloadmock).not.toHaveBeenCalled()
  })

  it('reloads once when SW is active but not controlling', async () => {
    Object.defineProperty(window, 'crossOriginIsolated', {
      configurable: true,
      value: false,
    })
    registermock.mockResolvedValue({})
    await ensurewasmcoep()
    expect(reloadmock).toHaveBeenCalledTimes(1)
    const guardkeys = Object.keys(localStorage).filter((key) =>
      key.startsWith('zss_wasm_coep_reload:'),
    )
    expect(guardkeys.length).toBe(1)
    expect(localStorage.getItem(guardkeys[0])).toContain(
      hashcoepswbody(SW_BODY),
    )
  })

  it('skips a second reload for the same SW version', async () => {
    Object.defineProperty(window, 'crossOriginIsolated', {
      configurable: true,
      value: false,
    })
    registermock.mockResolvedValue({})
    await ensurewasmcoep()
    expect(reloadmock).toHaveBeenCalledTimes(1)

    resetwasmcoepfortest()
    reloadmock.mockClear()
    setwasmcoepreloadfortest(reloadmock)
    await ensurewasmcoep()
    expect(reloadmock).not.toHaveBeenCalled()
  })
})
