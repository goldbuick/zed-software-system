jest.mock('zss/device/wanixclient/wanixbridge', () => ({
  registerwanixsessioncloseprune: jest.fn(),
  iswanixready: jest.fn(() => true),
  onwanixready: jest.fn((cb: () => void) => cb()),
}))

jest.mock('zss/device/wanixclient/wanixroom', () => ({
  readwanixroomconfig: jest.fn(() => ({ mode: 'task' })),
}))

jest.mock('zss/device/api', () => {
  const actual = jest.requireActual('zss/device/api')
  return {
    ...actual,
    apilog: jest.fn(),
    vmexportzedcafe: jest.fn(),
    vmimportzedcafe: jest.fn(),
    wanixserverreadzedcafetaskrid: jest.fn(),
    wanixserveriszedcafeexportlive: jest.fn(),
    wanixserverreadzedcafeexportfiles: jest.fn(),
    wanixserversynczedcafeexport: jest.fn(),
    wanixserversetzedcafeready: jest.fn(),
  }
})

jest.mock('zss/feature/wanix/wanixstateexport', () => {
  const actual = jest.requireActual(
    'zss/feature/wanix/wanixstateexport',
  ) as typeof import('zss/feature/wanix/wanixstateexport')
  return {
    ...actual,
    primezedcafeexportshadow: jest.fn(),
    buildzedcafeexportfiles: jest.fn(() => []),
    readbookcountfromexportfiles: jest.fn(() => 1),
  }
})

jest.mock('zss/feature/wanix/zedcafetreeschema', () => ({
  validatezedcafeexportpaths: jest.fn(() => ({ ok: true, errors: [] })),
}))

import {
  vmexportzedcafe,
  vmimportzedcafe,
  wanixserverreadzedcafeexportfiles,
  wanixserverreadzedcafetaskrid,
} from 'zss/device/api'
import { shouldprocesswanixclientmessage } from 'zss/device/wanixclient/filter'
import { handlezedcafefilechange } from 'zss/device/wanixclient/handlers/zedcafefilechange'
import {
  applyzedcafeexportfiles,
  exportfilestoguestfiles,
  kickzedcafepoll,
  resetwanixzedcafefortest,
  resolvevmzedcafeexportwaiter,
  resolvevmzedcafeimportwaiter,
  startzedcafepoll,
  stopzedcafepoll,
} from 'zss/device/wanixclient/wanixzedcafe'
import {
  markpendingdirtypaths,
  readpendingpollkick,
  readzedcafepollactive,
  resetwanixzedcafesessionfortest,
  setlasthostpushdoc,
  setpendingpollphase,
  setpendingsync,
} from 'zss/device/wanixclient/state'
import { zedcafeexportfilestodoc } from 'zss/feature/wanix/wanixstateexport'

const mockreadrid = wanixserverreadzedcafetaskrid as jest.Mock
const mockreadfiles = wanixserverreadzedcafeexportfiles as jest.Mock
const mockvmimport = vmimportzedcafe as jest.Mock
const mockvmexport = vmexportzedcafe as jest.Mock

const device = { id: 'dev', emit: jest.fn() } as never
const player = 'p1'
const encoder = new TextEncoder()

function makestatsbytes(label: string) {
  return encoder.encode(
    JSON.stringify({
      exportedAt: label,
      bookCount: 1,
      books: [{ id: 'b1', name: 'b1' }],
    }) + '\n',
  )
}

describe('zedcafe import poll', () => {
  beforeEach(() => {
    resetwanixzedcafefortest()
    resetwanixzedcafesessionfortest()
    mockreadrid.mockReset()
    mockreadfiles.mockReset()
    mockvmimport.mockReset()
    mockvmexport.mockReset()
  })

  afterEach(() => {
    stopzedcafepoll()
    resetwanixzedcafefortest()
    resetwanixzedcafesessionfortest()
  })

  it('startzedcafepoll marks active without interval tick', () => {
    startzedcafepoll(device, player)
    expect(readzedcafepollactive()).toBe(true)
    expect(mockreadrid).not.toHaveBeenCalled()
  })

  it('kickzedcafepoll emits when import-ready', () => {
    startzedcafepoll(device, player)
    kickzedcafepoll('file-change')
    expect(mockreadrid).toHaveBeenCalledWith(device, player)
  })

  it('kickzedcafepoll queues when poll inactive', () => {
    kickzedcafepoll()
    expect(mockreadrid).not.toHaveBeenCalled()
    expect(readpendingpollkick()).toBe(true)
  })

  it('kickzedcafepoll queues when phase in flight', () => {
    startzedcafepoll(device, player)
    setpendingpollphase('tree')
    kickzedcafepoll('file-change')
    expect(mockreadrid).not.toHaveBeenCalled()
    expect(readpendingpollkick()).toBe(true)
  })

  it('applyzedcafeexportfiles prefers poll tree over host guesttree', () => {
    startzedcafepoll(device, player)
    setpendingpollphase('tree')
    setpendingsync({
      phase: 'guesttree',
      files: [],
      shadowdoc: {},
      memcount: 1,
      options: undefined,
    } as never)
    applyzedcafeexportfiles(device, player, [])
    expect(mockreadfiles).toHaveBeenCalledWith(device, player)
  })

  it('handlezedcafefilechange kicks import', () => {
    startzedcafepoll(device, player)
    handlezedcafefilechange(device, {
      target: 'zedcafefilechange',
      player: '',
      data: undefined,
    } as never)
    expect(mockreadrid).toHaveBeenCalledWith(device, player)
  })

  it('allows empty-player zedcafefilechange through filter', () => {
    expect(
      shouldprocesswanixclientmessage({
        target: 'zedcafefilechange',
        player: '',
      } as never),
    ).toBe(true)
  })

  it('imports when terrain differs even if dirty paths are stats-only', async () => {
    const hostfiles = [
      {
        path: 'stats.json',
        bytes: makestatsbytes('host'),
      },
      {
        path: 'title/board/terrain.json',
        bytes: encoder.encode('{"cells":"classic"}\n'),
      },
    ]
    const guestfiles = [
      {
        path: 'stats.json',
        bytes: makestatsbytes('host'),
      },
      {
        path: 'title/board/terrain.json',
        bytes: encoder.encode('{"cells":"dungeon"}\n'),
      },
    ]
    setlasthostpushdoc(zedcafeexportfilestodoc(hostfiles))
    startzedcafepoll(device, player)
    // Dirty notify listed only stats — old scoped compare would skip terrain.
    markpendingdirtypaths(['stats.json'])
    setpendingpollphase('tree')
    mockvmimport.mockImplementation(() => {
      resolvevmzedcafeimportwaiter({
        ok: true,
        changed: true,
        bookcount: 1,
      })
    })
    mockvmexport.mockImplementation(() => {
      resolvevmzedcafeexportwaiter(guestfiles)
    })
    applyzedcafeexportfiles(device, player, exportfilestoguestfiles(guestfiles))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(mockvmimport).toHaveBeenCalled()
    const sent = mockvmimport.mock.calls[0][2] as { path: string }[]
    expect(sent.some((file) => file.path === 'title/board/terrain.json')).toBe(
      true,
    )
  })
})
