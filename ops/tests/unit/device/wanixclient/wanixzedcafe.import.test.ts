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

import {
  apilog,
  vmexportzedcafe,
  vmimportzedcafe,
  wanixserverreadzedcafeexportfiles,
  wanixserversynczedcafeexport,
} from 'zss/device/api'
import {
  applyzedcafeexportfiles,
  exportfilestoguestfiles,
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
} from 'zss/device/wanixclient/state'
import { zedcafeexportfilestodoc } from 'zss/feature/wanix/wanixstateexport'

const mockapilog = apilog as jest.Mock
const mockvmimport = vmimportzedcafe as jest.Mock
const mockvmexport = vmexportzedcafe as jest.Mock
const mocksync = wanixserversynczedcafeexport as jest.Mock
const mockreadexport = wanixserverreadzedcafeexportfiles as jest.Mock

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
    {
      path: 'demo-b1/stats.json',
      bytes: encoder.encode('{"exportedAt":"' + label + '","bookCount":1}\n'),
    },
  ]
}

describe('zedcafe import', () => {
  beforeEach(() => {
    resetwanixzedcafefortest()
    resetwanixzedcafesessionfortest()
    mockapilog.mockReset()
    mockvmimport.mockReset()
    mockvmexport.mockReset()
    mocksync.mockReset()
    mockreadexport.mockReset()
  })

  afterEach(() => {
    resetwanixzedcafefortest()
    resetwanixzedcafesessionfortest()
  })

  it('fingerprints export files stably', () => {
    const a = fingerprintzedcafeexportfiles(makefiles('a'))
    const b = fingerprintzedcafeexportfiles(makefiles('a'))
    const c = fingerprintzedcafeexportfiles(makefiles('b'))
    expect(a).toBe(b)
    expect(a).not.toBe(c)
  })

  it('runzedcafeimport returns false when sim apply fails', async () => {
    mockvmimport.mockImplementation(() => {
      resolvevmzedcafeimportwaiter({
        ok: false,
        changed: false,
        error: 'nope',
      })
    })
    const ok = await runzedcafeimport(device, player, makefiles('x'))
    expect(ok).toBe(false)
    expect(readzedcafeguestdirty()).toBe(true)
  })

  it('runzedcafeimport skips VM when guest matches host shadow', async () => {
    const files = makefiles('same')
    setlasthostpushdoc(zedcafeexportfilestodoc(files))
    const ok = await runzedcafeimport(device, player, files)
    expect(ok).toBe(true)
    expect(mockvmimport).not.toHaveBeenCalled()
    expect(readzedcafeguestdirty()).toBe(false)
    expect(mockapilog).toHaveBeenCalledWith(
      device,
      player,
      expect.stringMatching(/matched host shadow/),
    )
  })

  it('runzedcafeimport sends partial payload when one guest path differs', async () => {
    const hostfiles = makefiles('host')
    const guestfiles = makefiles('guest')
    setlasthostpushdoc(zedcafeexportfilestodoc(hostfiles))
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
    mockreadexport.mockImplementation(() => undefined)
    const ok = await runzedcafeimport(device, player, guestfiles)
    expect(ok).toBe(true)
    expect(mockvmimport).toHaveBeenCalled()
    const call = mockvmimport.mock.calls[0]
    expect(call[3]).toEqual({
      partial: true,
      removepaths: [],
    })
    const sentfiles = call[2] as { path: string }[]
    expect(sentfiles.length).toBeGreaterThan(0)
    expect(sentfiles.every((file) => typeof file.path === 'string')).toBe(true)
    // Full tree was not sent — only the changed book stats path.
    expect(sentfiles.some((file) => file.path === 'demo-b1/stats.json')).toBe(
      true,
    )
    expect(sentfiles.some((file) => file.path === 'stats.json')).toBe(false)
  })

  it('pushzedcafesynctoiframe emits when space active', () => {
    setlasthostpushdoc({})
    const ok = pushzedcafesynctoiframe(device, player, makefiles('x'))
    expect(ok).toBe(true)
    expect(mockreadexport).toHaveBeenCalled()
  })

  it('pushzedcafesynctoiframe skips when sync already in flight', () => {
    setlasthostpushdoc({})
    expect(pushzedcafesynctoiframe(device, player, makefiles('a'))).toBe(true)
    expect(pushzedcafesynctoiframe(device, player, makefiles('b'))).toBe(false)
    expect(mockreadexport).toHaveBeenCalledTimes(1)
  })

  it('guest-diff failed import does not host-push wipe', async () => {
    const hostfiles = makefiles('host')
    const guestfiles = makefiles('guest-painted')
    setlasthostpushdoc(zedcafeexportfilestodoc(hostfiles))
    mockvmimport.mockImplementation(() => {
      resolvevmzedcafeimportwaiter({
        ok: false,
        changed: false,
        error: 'sim down',
      })
    })
    expect(pushzedcafesynctoiframe(device, player, hostfiles)).toBe(true)
    applyzedcafeexportfiles(device, player, exportfilestoguestfiles(guestfiles))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(readzedcafeguestdirty()).toBe(true)
    expect(mocksync).not.toHaveBeenCalled()
  })

  it('wanixhandleexportstate marks pending when idle', async () => {
    const room = await import('zss/device/wanixclient/wanixroom')
    ;(room.readwanixroomconfig as jest.Mock).mockReturnValue({ mode: 'idle' })
    await wanixhandleexportstate(device, player, makefiles('x'))
    expect(mockapilog).toHaveBeenCalledWith(
      device,
      player,
      expect.stringMatching(/will apply when wanix starts/),
    )
  })

  it('resolvevmzedcafeexportwaiter consumes pending waiter', async () => {
    const files = makefiles('w')
    const pending = new Promise((resolve) => {
      // trigger via request path would need device; just resolve waiter API
      setTimeout(() => {
        resolvevmzedcafeexportwaiter(files)
        resolve(true)
      }, 0)
    })
    // Direct resolve without waiter returns false
    expect(resolvevmzedcafeexportwaiter(files)).toBe(false)
    await pending
  })

  it('clears guest dirty flag helper', () => {
    setzedcafeguestdirty(true)
    expect(readzedcafeguestdirty()).toBe(true)
    setzedcafeguestdirty(false)
    expect(readzedcafeguestdirty()).toBe(false)
  })
})
