jest.mock('zss/device/api', () => ({
  apilog: jest.fn(),
  wanixrequestzedcafeexport: jest.fn(),
}))

jest.mock('zss/feature/wanix/wanixhost', () => ({
  iswanixspaceactive: jest.fn(() => false),
  putwanixfile: jest.fn(async () => undefined),
}))

jest.mock('zss/feature/wanix/wanixsession', () => ({
  haswanixvms: jest.fn(() => false),
}))

jest.mock('zss/feature/wanix/wanixtermiframehost', () => ({
  iframecapturezedcafeexport: jest.fn(async () => []),
  iframechildhaltzedcafe: jest.fn(async () => undefined),
  iframechildreadzedcafetaskrid: jest.fn(async () => null),
  iframechildrefreshvmzedcafeexport: jest.fn(async () => undefined),
  iframechildsetzedcafeready: jest.fn(async () => undefined),
  iframechildsynczedcafe: jest.fn(async () => undefined),
  iframechildwaitzedcafeready: jest.fn(async () => null),
}))

jest.mock('zss/feature/wanix/wanixstateexport', () => ({
  buildzedcafeexportfiles: jest.fn(() => [
    {
      path: 'stats.json',
      bytes: new TextEncoder().encode(
        JSON.stringify({ bookCount: 0, books: [] }),
      ),
    },
  ]),
}))

import { wanixrequestzedcafeexport } from 'zss/device/api'
import { buildzedcafeexportfiles } from 'zss/feature/wanix/wanixstateexport'
import {
  fetchzedcafeexportfiles,
  readzedcafeexportbookcount,
  requestvmzedcafeexportfiles,
  resetwanixzedcafefortest,
  resolvevmzedcafeexportwaiter,
  wanixhandleexportstate,
} from 'zss/feature/wanix/wanixzedcafe'
import { haswanixvms } from 'zss/feature/wanix/wanixsession'
import { iframechildrefreshvmzedcafeexport } from 'zss/feature/wanix/wanixtermiframehost'
import {
  readwanixzedcafeready,
  readwanixzedcafetaskrid,
  readlasthostpushfingerprint,
  resetwanixzedcafesessionfortest,
  setlasthostpushfingerprint,
  setwanixzedcafeready,
  setwanixzedcafetaskrid,
} from 'zss/feature/wanix/wanixzedcafesession'

const requestmock = wanixrequestzedcafeexport as jest.Mock
const buildmock = buildzedcafeexportfiles as jest.Mock
const hasvmmock = haswanixvms as jest.Mock
const refreshmock = iframechildrefreshvmzedcafeexport as jest.Mock

function encodestats(bookcount: number) {
  return new TextEncoder().encode(
    JSON.stringify({ bookCount: bookcount, books: [] }),
  )
}

function sampleexport(bookcount: number) {
  return [
    { path: 'stats.json', bytes: encodestats(bookcount) },
    {
      path: 'books/main-abc/stats.json',
      bytes: new TextEncoder().encode('{}'),
    },
  ]
}

describe('zedcafe sim export fetch', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetwanixzedcafefortest()
    resetwanixzedcafesessionfortest()
  })

  it('readzedcafeexportbookcount parses stats.json', () => {
    expect(readzedcafeexportbookcount(sampleexport(2))).toBe(2)
    expect(readzedcafeexportbookcount(sampleexport(0))).toBe(0)
  })

  it('resolvevmzedcafeexportwaiter resolves requestvmzedcafeexportfiles', async () => {
    const device = { emit: jest.fn() }
    const files = sampleexport(1)
    const pending = requestvmzedcafeexportfiles(device as never, 'player1', 5000)
    expect(resolvevmzedcafeexportwaiter(files)).toBe(true)
    await expect(pending).resolves.toEqual(files)
    expect(requestmock).toHaveBeenCalledWith(device, 'player1')
  })

  it('fetchzedcafeexportfiles falls back to local build on timeout', async () => {
    jest.useFakeTimers()
    const device = { emit: jest.fn() }
    const pending = fetchzedcafeexportfiles(device as never, 'player1', 1000)
    jest.advanceTimersByTime(1001)
    const files = await pending
    expect(buildmock).toHaveBeenCalled()
    expect(files).toHaveLength(1)
    jest.useRealTimers()
  })
})

describe('wanixhandleexportstate vm guest refresh', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetwanixzedcafefortest()
    resetwanixzedcafesessionfortest()
    setwanixzedcafeready(true)
    setwanixzedcafetaskrid('3')
    setlasthostpushfingerprint('old')
    hasvmmock.mockReturnValue(true)
    jest
      .spyOn(
        require('zss/feature/wanix/wanixhost'),
        'iswanixspaceactive',
      )
      .mockReturnValue(true)
    jest
      .spyOn(
        require('zss/feature/wanix/wanixtermiframehost'),
        'iframecapturezedcafeexport',
      )
      .mockResolvedValue([
        { path: 'stats.json', data: [...encodestats(0)] },
      ])
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('refreshes vm guest when export has books', async () => {
    const device = { emit: jest.fn() }
    await wanixhandleexportstate(device as never, 'player1', sampleexport(1))
    expect(refreshmock).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ path: 'books/main-abc/stats.json' }),
      ]),
    )
    expect(readwanixzedcafeready()).toBe(true)
    expect(readwanixzedcafetaskrid()).toBe('3')
  })
})
