import { ismobilewebbrowser } from 'zss/feature/detect'

const DESKTOP_CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const DESKTOP_FIREFOX =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0'
const DESKTOP_SAFARI =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
const MOBILE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
const CRIOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1'
const FXIOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/120.0 Mobile/15E148 Safari/605.1.15'
const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 13; Pixel) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
const ANDROID_FIREFOX =
  'Mozilla/5.0 (Android 13; Mobile; rv:120.0) Gecko/120.0 Firefox/120.0'

function stubnav(useragent: string, maxtouchpoints = 0) {
  Object.defineProperty(globalThis.navigator, 'userAgent', {
    configurable: true,
    get: () => useragent,
  })
  Object.defineProperty(globalThis.navigator, 'maxTouchPoints', {
    configurable: true,
    get: () => maxtouchpoints,
  })
}

describe('ismobilewebbrowser', () => {
  const originalua = navigator.userAgent
  const originaltouch = navigator.maxTouchPoints

  afterEach(() => {
    stubnav(originalua, originaltouch)
  })

  it('is true for mobile Safari, Chrome, and Firefox', () => {
    stubnav(MOBILE_SAFARI)
    expect(ismobilewebbrowser()).toBe(true)
    stubnav(CRIOS)
    expect(ismobilewebbrowser()).toBe(true)
    stubnav(FXIOS)
    expect(ismobilewebbrowser()).toBe(true)
    stubnav(ANDROID_CHROME)
    expect(ismobilewebbrowser()).toBe(true)
    stubnav(ANDROID_FIREFOX)
    expect(ismobilewebbrowser()).toBe(true)
    stubnav(DESKTOP_SAFARI, 5)
    expect(ismobilewebbrowser()).toBe(true)
  })

  it('is false for desktop Chrome, Firefox, and Safari', () => {
    stubnav(DESKTOP_CHROME)
    expect(ismobilewebbrowser()).toBe(false)
    stubnav(DESKTOP_FIREFOX)
    expect(ismobilewebbrowser()).toBe(false)
    stubnav(DESKTOP_SAFARI, 0)
    expect(ismobilewebbrowser()).toBe(false)
  })
})
