/**
 * @jest-environment jsdom
 */
const mockscreenwrite = jest.fn()

let terminalattached = false

jest.mock('zss/feature/wanix/wanixtermscreen', () => {
  const actual = jest.requireActual('zss/feature/wanix/wanixtermscreen')
  return {
    ...actual,
    wanixtermscreenwrite: (...args: unknown[]) => mockscreenwrite(...args),
  }
})

jest.mock('zss/feature/wanix/wanixterminalmode', () => {
  const actual = jest.requireActual('zss/feature/wanix/wanixterminalmode')
  return {
    ...actual,
    readterminalmodeattached: () => terminalattached,
    enterwanixattachedterminal: () => {
      terminalattached = true
    },
  }
})

import { resetwanixsessionfortest } from 'zss/feature/wanix/wanixsession'
import {
  wanixtermiframehosttestreset,
  wanixtermiframehosttestsetattached,
  wanixtermiframehosttesttermout,
} from 'zss/feature/wanix/wanixtermiframehost'

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

describe('wanix iframe term-out attach-on-serial', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    terminalattached = false
    wanixtermiframehosttestreset()
    resetwanixsessionfortest()
  })

  it('auto-attaches tile mode and replays buffered serial on first chunk', async () => {
    wanixtermiframehosttestsetattached('task', 'demo-wasm')
    wanixtermiframehosttesttermout('task', 'demo-wasm', 'hello')
    await flush()
    expect(terminalattached).toBe(true)
    expect(mockscreenwrite).toHaveBeenCalledWith('hello')
  })

  it('appends to tile screen when already attached', () => {
    wanixtermiframehosttestsetattached('task', 'demo-wasm', 'boot\n')
    terminalattached = true
    wanixtermiframehosttesttermout('task', 'demo-wasm', 'more')
    expect(mockscreenwrite).toHaveBeenCalledWith('more')
  })

  it('ignores output for non-attached targets', () => {
    wanixtermiframehosttestsetattached('task', 'demo-wasm')
    wanixtermiframehosttesttermout('task', 'other-wasm', 'hello')
    expect(mockscreenwrite).not.toHaveBeenCalled()
  })
})
