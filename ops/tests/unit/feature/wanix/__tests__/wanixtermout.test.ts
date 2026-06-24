/**
 * @jest-environment jsdom
 */
const mockscreensync = jest.fn()

let terminalattached = false

jest.mock('zss/feature/wanix/wanixtermscreen', () => {
  const actual = jest.requireActual('zss/feature/wanix/wanixtermscreen')
  return {
    ...actual,
    wanixtermscreensync: (...args: unknown[]) => mockscreensync(...args),
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

import { COLOR } from 'zss/words/types'
import type { WanixTermCellsSnapshot } from 'zss/feature/wanix/wanixtermcells'
import { resetwanixsessionfortest } from 'zss/feature/wanix/wanixsession'
import {
  wanixtermiframehosttestcells,
  wanixtermiframehosttestreset,
  wanixtermiframehosttestsetattached,
} from 'zss/feature/wanix/wanixtermiframehost'

function makesnapshot(text: string, cols = 10): WanixTermCellsSnapshot {
  const rows = 1
  const char = new Array<number>(cols * rows).fill(32)
  const color = new Array<number>(cols * rows).fill(COLOR.WHITE)
  const bg = new Array<number>(cols * rows).fill(COLOR.BLACK)
  for (let i = 0; i < text.length && i < cols; i++) {
    char[i] = text.charCodeAt(i)
  }
  return {
    cols,
    rows,
    char,
    color,
    bg,
    cursorx: text.length,
    cursory: 0,
    cursorvisible: true,
  }
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

describe('wanix iframe term cells attach', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    terminalattached = false
    wanixtermiframehosttestreset()
    resetwanixsessionfortest()
  })

  it('auto-attaches tile mode on first cell snapshot', async () => {
    wanixtermiframehosttestsetattached('task', 'demo-wasm')
    wanixtermiframehosttestcells('task', 'demo-wasm', makesnapshot('hello'))
    await flush()
    expect(terminalattached).toBe(true)
    expect(mockscreensync).toHaveBeenCalled()
  })

  it('syncs to tile screen when already attached', () => {
    wanixtermiframehosttestsetattached('task', 'demo-wasm')
    terminalattached = true
    const snapshot = makesnapshot('more')
    wanixtermiframehosttestcells('task', 'demo-wasm', snapshot)
    expect(mockscreensync).toHaveBeenCalledWith(snapshot)
  })

  it('ignores cells for non-attached targets', () => {
    wanixtermiframehosttestsetattached('task', 'demo-wasm')
    wanixtermiframehosttestcells('task', 'other-wasm', makesnapshot('hello'))
    expect(mockscreensync).not.toHaveBeenCalled()
  })
})
