/**
 * @jest-environment jsdom
 */
const mockscreenwrite = jest.fn()

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
    readterminalmodeattached: () => true,
    enterwanixattachedterminal: () => {},
  }
})

import { resetwanixsessionfortest } from 'zss/feature/wanix/wanixsession'
import {
  wanixtermiframehosttestreadserial,
  wanixtermiframehosttestreset,
  wanixtermiframehosttestsetattached,
  wanixtermiframehosttestsetpendingvmline,
  wanixtermiframehosttesttermout,
} from 'zss/feature/wanix/wanixtermiframehost'

describe('wanix iframe vm line echo', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    wanixtermiframehosttestreset()
    resetwanixsessionfortest()
  })

  it('strips the local echo of a submitted vm line', () => {
    wanixtermiframehosttestsetattached('vm', 'linux-vm')
    wanixtermiframehosttestsetpendingvmline('linux-vm', 'ls')
    wanixtermiframehosttesttermout('vm', 'linux-vm', 'ls\r\noutput')
    expect(mockscreenwrite).toHaveBeenCalledWith('output')
    expect(wanixtermiframehosttestreadserial('linux-vm')).toBe('output')
  })

  it('keeps serial that does not match the pending line', () => {
    wanixtermiframehosttestsetattached('vm', 'linux-vm')
    wanixtermiframehosttestsetpendingvmline('linux-vm', 'ls')
    wanixtermiframehosttesttermout('vm', 'linux-vm', 'different')
    expect(mockscreenwrite).toHaveBeenCalledWith('different')
  })
})
