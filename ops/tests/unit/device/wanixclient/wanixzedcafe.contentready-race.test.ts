jest.mock('zss/device/api', () => {
  const actual = jest.requireActual('zss/device/api')
  return {
    ...actual,
    apilog: jest.fn(),
    wanixserversetzedcafeready: jest.fn(),
    wanixserversynczedcafeexport: jest.fn(),
    wanixserverreadzedcafeexportfiles: jest.fn(),
    wanixserverreadzedcafetaskrid: jest.fn(),
    wanixserveriszedcafeexportlive: jest.fn(),
    vmexportzedcafe: jest.fn(),
    vmimportzedcafe: jest.fn(),
  }
})

jest.mock('zss/device/wanixclient/wanixroom', () => ({
  readwanixroomconfig: jest.fn(() => ({ mode: 'task' })),
}))

import {
  applyzedcafesyncresult,
  armzedcafepollfromhostfiles,
  handlewanixexportready,
  resetwanixzedcafefortest,
} from 'zss/device/wanixclient/wanixzedcafe'
import {
  readzedcafepollactive,
  resetwanixzedcafesessionfortest,
  setpendingsync,
} from 'zss/device/wanixclient/state'
import { zedcafeexportfilestodoc } from 'zss/feature/wanix/wanixstateexport'

const device = { id: 'dev', emit: jest.fn() } as never
const player = 'p1'

const bookfiles = [
  {
    path: 'stats.json',
    bytes: new TextEncoder().encode(
      '{"exportedAt":"t","bookCount":1,"books":[]}\n',
    ),
  },
]

describe('zedcafe poll arm', () => {
  beforeEach(() => {
    resetwanixzedcafefortest()
    resetwanixzedcafesessionfortest()
  })

  afterEach(() => {
    resetwanixzedcafefortest()
    resetwanixzedcafesessionfortest()
  })

  it('arms import poll on parent sync result (iframe push already finished)', () => {
    setpendingsync({
      device,
      player,
      files: bookfiles,
      shadowdoc: zedcafeexportfilestodoc(bookfiles),
      memcount: 1,
      phase: 'sync',
    })
    expect(readzedcafepollactive()).toBe(false)

    // content-ready is informational; sync result owns arming
    handlewanixexportready(device, player, '3', 'content-ready')
    expect(readzedcafepollactive()).toBe(false)

    applyzedcafesyncresult(device, player, { ok: true, taskrid: '3' })
    expect(readzedcafepollactive()).toBe(true)
  })

  it('arms import poll from host files after drop-pull', () => {
    expect(readzedcafepollactive()).toBe(false)
    armzedcafepollfromhostfiles(device, player, bookfiles)
    expect(readzedcafepollactive()).toBe(true)
  })
})
