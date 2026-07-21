/**
 * @jest-environment jsdom
 */
import { apierror } from 'zss/device/api'

jest.mock('zss/device/api', () => ({
  apierror: jest.fn(),
}))

import {
  ensurewasmcoep,
  readcoepbuildtoken,
  resetwasmcoepfortest,
  setwasmcoepreloadfortest,
} from 'zss/feature/synth/backend/wasm/coopcoep'

const SW_URL = '/coep/enable-threads.js'

describe('ensurewasmcoep', () => {
  const originalisolated = Object.getOwnPropertyDescriptor(
    window,
    'crossOriginIsolated',
  )
  let reloadmock: jest.Mock
  let registermock: jest.Mock
  let controller: ServiceWorker | null

  const TEST_BUILD_TOKEN = 'test-commit-hash'

  beforeEach(() => {
    resetwasmcoepfortest()
    localStorage.clear()
    process.env.ZSS_COMMIT_HASH = TEST_BUILD_TOKEN
    ;(apierror as jest.Mock).mockReset()
    reloadmock = jest.fn()
    setwasmcoepreloadfortest(reloadmock)
    controller = null
    registermock = jest.fn()
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

  it('readcoepbuildtoken returns the cafe commit hash', () => {
    expect(readcoepbuildtoken()).toBe(TEST_BUILD_TOKEN)
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

  it('reloads when controller exists but page is not isolated', async () => {
    Object.defineProperty(window, 'crossOriginIsolated', {
      configurable: true,
      value: false,
    })
    controller = { scriptURL: SW_URL } as ServiceWorker
    registermock.mockResolvedValue({})
    await ensurewasmcoep()
    expect(registermock).toHaveBeenCalledWith(
      `${SW_URL}?v=${readcoepbuildtoken()}`,
    )
    expect(reloadmock).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem('zss_wasm_coep_reload')).toBe(
      readcoepbuildtoken(),
    )
  })

  it('reloads once when SW is active but not controlling', async () => {
    Object.defineProperty(window, 'crossOriginIsolated', {
      configurable: true,
      value: false,
    })
    registermock.mockResolvedValue({})
    await ensurewasmcoep()
    expect(reloadmock).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem('zss_wasm_coep_reload')).toBe(
      readcoepbuildtoken(),
    )
  })

  it('skips a second reload for the same build and reports error', async () => {
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
    expect(apierror).toHaveBeenCalledWith(
      expect.anything(),
      '',
      'wasm',
      'COOP/COEP isolation failed after reload - SharedArrayBuffer unavailable',
    )
  })

  it('allows another reload when the build token changes', async () => {
    Object.defineProperty(window, 'crossOriginIsolated', {
      configurable: true,
      value: false,
    })
    localStorage.setItem('zss_wasm_coep_reload', 'old-build-token')
    registermock.mockResolvedValue({})
    await ensurewasmcoep()
    expect(reloadmock).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem('zss_wasm_coep_reload')).toBe(
      readcoepbuildtoken(),
    )
  })
})
