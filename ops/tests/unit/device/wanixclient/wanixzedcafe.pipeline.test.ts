jest.mock('zss/device/api', () => {
  const actual = jest.requireActual('zss/device/api')
  return {
    ...actual,
    wanixserverreadzedcafeexportfiles: jest.fn(),
    wanixserversynczedcafeexport: jest.fn(),
    wanixserversetzedcafeready: jest.fn(),
    wanixserverreadzedcafetaskrid: jest.fn(),
    wanixserveriszedcafeexportlive: jest.fn(),
    apilog: jest.fn(),
    vmexportzedcafe: jest.fn(),
    vmimportzedcafe: jest.fn(),
  }
})

jest.mock('zss/device/wanixclient/wanixroom', () => ({
  readwanixroomconfig: jest.fn(() => ({ mode: 'task' })),
}))

import {
  wanixserverreadzedcafeexportfiles,
  wanixserversynczedcafeexport,
} from 'zss/device/api'
import { zedcafeexportfilestodoc } from 'zss/feature/wanix/wanixstateexport'
import {
  applyzedcafeexportfiles,
  applyzedcafesyncresult,
  ensurezedcafeexportready,
  pushzedcafesynctoiframe,
  resetwanixzedcafefortest,
} from 'zss/device/wanixclient/wanixzedcafe'
import {
  resetwanixzedcafesessionfortest,
  setlasthostpushdoc,
} from 'zss/device/wanixclient/state'

const mockreadfiles = wanixserverreadzedcafeexportfiles as jest.Mock
const mocksync = wanixserversynczedcafeexport as jest.Mock

const device = { id: 'dev', emit: jest.fn() } as never
const player = 'p1'
const emptyfiles = [
  {
    path: 'stats.json',
    bytes: new TextEncoder().encode('{"bookCount":0,"books":[]}\n'),
  },
]
const bookfiles = [
  {
    path: 'stats.json',
    bytes: new TextEncoder().encode(
      '{"exportedAt":"t","bookCount":1,"books":[]}\n',
    ),
  },
  {
    path: 'demo-sid_book/stats.json',
    bytes: new TextEncoder().encode('{"exportedAt":"t","bookCount":1}\n'),
  },
]

function guestpayload(
  files: { path: string; bytes: Uint8Array }[],
): { path: string; data: number[] }[] {
  return files.map((file) => ({ path: file.path, data: [...file.bytes] }))
}

describe('pushzedcafesynctoiframe pipeline', () => {
  beforeEach(() => {
    resetwanixzedcafefortest()
    resetwanixzedcafesessionfortest()
    mockreadfiles.mockReset()
    mocksync.mockReset()
  })

  afterEach(() => {
    resetwanixzedcafefortest()
  })

  it('emits read then sync when guest tree matches last push', () => {
    setlasthostpushdoc(zedcafeexportfilestodoc(emptyfiles))
    ensurezedcafeexportready(device, player, bookfiles)
    expect(mockreadfiles).toHaveBeenCalledWith(device, player)

    applyzedcafeexportfiles(device, player, guestpayload(emptyfiles))
    expect(mocksync).toHaveBeenCalled()

    applyzedcafesyncresult(device, player, { ok: true, taskrid: '7' })
  })

  it('skips sync emit when host export doc is unchanged', () => {
    setlasthostpushdoc(zedcafeexportfilestodoc(bookfiles))
    const ok = pushzedcafesynctoiframe(device, player, bookfiles)
    expect(ok).toBe(true)
    expect(mockreadfiles).toHaveBeenCalled()
    applyzedcafeexportfiles(device, player, guestpayload(bookfiles))
    expect(mocksync).not.toHaveBeenCalled()
  })

  it('ensurezedcafeexportready is fire-and-forget emit', () => {
    setlasthostpushdoc(zedcafeexportfilestodoc(emptyfiles))
    ensurezedcafeexportready(device, player, bookfiles)
    expect(mockreadfiles).toHaveBeenCalledWith(device, player)
  })
})
