jest.mock('zss/device/wanixclient/wanixbridge', () => ({
  callwanixrpc: jest.fn(),
  registerwanixsessioncloseprune: jest.fn(),
}))

jest.mock('zss/device/wanixclient/wanixexportwait', () => ({
  waitwanixexportcontentready: jest.fn(async () => undefined),
}))

jest.mock('zss/device/wanixclient/wanixroom', () => ({
  readwanixroomconfig: jest.fn(() => ({ mode: 'task' })),
}))

jest.mock('zss/device/api', () => ({
  apilog: jest.fn(),
  vmexportzedcafe: jest.fn(),
  vmimportzedcafe: jest.fn(),
}))

jest.mock('zss/feature/wanix/wanixstateexport', () => {
  const actual = jest.requireActual(
    'zss/feature/wanix/wanixstateexport',
  ) as typeof import('zss/feature/wanix/wanixstateexport')
  return {
    ...actual,
    buildzedcafeexportfiles: jest.fn(() => []),
    primezedcafeexportshadow: jest.fn(),
    readbookcountfromexportfiles: jest.fn((files: { path: string }[]) => {
      const stats = files.find((file) => file.path === 'stats.json')
      if (!stats) {
        return 0
      }
      return 1
    }),
  }
})

jest.mock('zss/feature/wanix/zedcafetreeschema', () => ({
  validatezedcafeexportpaths: jest.fn(() => ({ ok: true, errors: [] })),
}))

import { apilog, vmexportzedcafe, vmimportzedcafe } from 'zss/device/api'
import { callwanixrpc } from 'zss/device/wanixclient/wanixbridge'
import {
  fingerprintzedcafeexportfiles,
  pushzedcafesynctoiframe,
  resetwanixzedcafefortest,
  resolvevmzedcafeexportwaiter,
  resolvevmzedcafeimportwaiter,
  runzedcafeimport,
  wanixhandleexportstate,
} from 'zss/device/wanixclient/wanixzedcafe'
import {
  readzedcafeguestdirty,
  resetwanixzedcafesessionfortest,
  setlasthostpushdoc,
  setzedcafeguestdirty,
} from 'zss/device/wanixclient/wanixzedcafesession'

const mockrpc = callwanixrpc as jest.Mock
const mockapilog = apilog as jest.Mock
const mockvmimport = vmimportzedcafe as jest.Mock
const mockvmexport = vmexportzedcafe as jest.Mock

const device = { id: 'dev', emit: jest.fn() } as never
const player = 'p1'

const encoder = new TextEncoder()

function makefiles(label: string) {
  return [
    {
      path: 'stats.json',
      bytes: encoder.encode(
        JSON.stringify({
          exportedAt: label,
          bookCount: 1,
          books: [{ id: 'b1', name: 'b1' }],
        }) + '\n',
      ),
    },
  ]
}

describe('zedcafe sim import orchestration', () => {
  beforeEach(() => {
    resetwanixzedcafefortest()
    resetwanixzedcafesessionfortest()
    mockrpc.mockReset()
    mockapilog.mockReset()
    mockvmimport.mockReset()
    mockvmexport.mockReset()
    mockrpc.mockImplementation(async (method: string) => {
      switch (method) {
        case 'synczedcafeexport':
          return { ok: true, taskrid: '7' }
        case 'waitzedcafecontentready':
          return true
        case 'setzedcafeready':
          return true
        case 'readzedcafetaskrid':
          return '7'
        case 'readzedcafeexportfiles':
          return [
            {
              path: 'stats.json',
              data: [
                ...encoder.encode(
                  '{"exportedAt":"guest","bookCount":1,"books":[{"id":"b1"}]}\n',
                ),
              ],
            },
          ]
        default:
          return null
      }
    })
  })

  afterEach(() => {
    resetwanixzedcafefortest()
    resetwanixzedcafesessionfortest()
  })

  it('routes import through vm:importzedcafe then re-exports', async () => {
    const guest = makefiles('guest')
    const applied = makefiles('applied')
    mockvmimport.mockImplementation((_d, _p, _files) => {
      resolvevmzedcafeimportwaiter({
        ok: true,
        changed: true,
        bookcount: 1,
      })
    })
    mockvmexport.mockImplementation(() => {
      resolvevmzedcafeexportwaiter(applied)
    })

    const ok = await runzedcafeimport(device, player, guest)
    expect(ok).toBe(true)
    expect(mockvmimport).toHaveBeenCalledWith(device, player, guest)
    expect(mockvmexport).toHaveBeenCalled()
    expect(mockrpc).toHaveBeenCalledWith(
      'synczedcafeexport',
      expect.any(Array),
      expect.any(Number),
    )
    expect(readzedcafeguestdirty()).toBe(false)
  })

  it('skips stale host push while guest-dirty', async () => {
    setzedcafeguestdirty(true)
    const files = makefiles('host')
    const ok = await pushzedcafesynctoiframe(device, player, files)
    expect(ok).toBe(false)
    expect(mockrpc).not.toHaveBeenCalledWith(
      'synczedcafeexport',
      expect.anything(),
      expect.anything(),
    )
  })

  it('allows fromimport push while guest-dirty', async () => {
    setzedcafeguestdirty(true)
    const files = makefiles('applied')
    const ok = await pushzedcafesynctoiframe(device, player, files, {
      fromimport: true,
    })
    expect(ok).toBe(true)
    expect(mockrpc).toHaveBeenCalledWith(
      'synczedcafeexport',
      expect.any(Array),
      expect.any(Number),
    )
  })

  it('wanixhandleexportstate does not push pre-import snapshot after guest import', async () => {
    const hostfiles = makefiles('host-old')
    const guesttree = [
      {
        path: 'stats.json',
        data: [
          ...encoder.encode(
            '{"exportedAt":"guest-new","bookCount":1,"books":[{"id":"b1"}]}\n',
          ),
        ],
      },
    ]
    mockrpc.mockImplementation(async (method: string) => {
      if (method === 'readzedcafeexportfiles') {
        return guesttree
      }
      if (method === 'synczedcafeexport') {
        return { ok: true, taskrid: '7' }
      }
      if (method === 'waitzedcafecontentready') {
        return true
      }
      if (method === 'setzedcafeready') {
        return true
      }
      if (method === 'readzedcafetaskrid') {
        return '7'
      }
      return null
    })
    setlasthostpushdoc({})
    mockvmimport.mockImplementation(() => {
      resolvevmzedcafeimportwaiter({ ok: true, changed: true, bookcount: 1 })
    })
    mockvmexport.mockImplementation(() => {
      resolvevmzedcafeexportwaiter(makefiles('post-import'))
    })

    await wanixhandleexportstate(device, player, hostfiles)

    const synccalls = mockrpc.mock.calls.filter(
      (call) => call[0] === 'synczedcafeexport',
    )
    expect(synccalls.length).toBe(1)
    const pushed = synccalls[0][1][0] as { path: string; data: number[] }[]
    const stats = JSON.parse(
      new TextDecoder().decode(new Uint8Array(pushed[0].data)),
    ) as { exportedAt: string }
    expect(stats.exportedAt).toBe('post-import')
  })

  it('fingerprint differs when guest content changes', () => {
    const a = fingerprintzedcafeexportfiles(makefiles('a'))
    const b = fingerprintzedcafeexportfiles(makefiles('b'))
    expect(a).not.toBe(b)
  })
})
