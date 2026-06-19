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

import {
  resetwanixhostfortest,
  wanixhosttestsetattached,
  wanixhosttesttermout,
} from 'zss/feature/wanix/wanixhost'
import { resetwanixsessionfortest } from 'zss/feature/wanix/wanixsession'

describe('wanix term-out attach-on-serial', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    terminalattached = false
    resetwanixhostfortest()
    resetwanixsessionfortest()
  })

  it('auto-attaches tile mode and replays buffered serial on first chunk', () => {
    wanixhosttestsetattached('task', 'demo-wasm')
    wanixhosttesttermout('task', 'demo-wasm', 'hello')
    expect(terminalattached).toBe(true)
    expect(mockscreenwrite).toHaveBeenCalledWith('hello')
  })

  it('appends to tile screen when already attached', () => {
    wanixhosttestsetattached('task', 'demo-wasm', 'boot\n')
    terminalattached = true
    wanixhosttesttermout('task', 'demo-wasm', 'more')
    expect(mockscreenwrite).toHaveBeenCalledWith('more')
  })

  it('ignores output for non-attached targets', () => {
    wanixhosttestsetattached('task', 'demo-wasm')
    wanixhosttesttermout('task', 'other-wasm', 'hello')
    expect(mockscreenwrite).not.toHaveBeenCalled()
  })
})
