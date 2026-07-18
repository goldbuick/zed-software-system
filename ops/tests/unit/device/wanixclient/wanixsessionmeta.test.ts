import {
  resetwanixattachforidle,
  setattachedsession,
  setwanixactivesession,
} from 'zss/device/wanixclient/wanixdisplay'
import {
  formatwanixtermstatusline,
  readwanixsessionlabel,
  readwanixsessionmeta,
} from 'zss/device/wanixclient/wanixsessionmeta'
import {
  applywanixtermread,
  resetwanixtermbufferfortest,
} from 'zss/device/wanixclient/wanixtermbuffer'
import type { WanixTermCellsSnapshot } from 'zss/feature/wanix/wanixtermgridstate'
import {
  resolvewanixtermdumpsession,
  writewanixtermdump,
  writewanixtermstatus,
} from 'zss/device/wanixclient/wanixtermhandlers'

function makesnapshot(sessionkey: string): WanixTermCellsSnapshot {
  return {
    cols: 80,
    rows: 24,
    char: new Array(80 * 24).fill(32),
    color: new Array(80 * 24).fill(15),
    bg: new Array(80 * 24).fill(0),
    cursorx: 0,
    cursory: 0,
    cursorvisible: true,
    scrollbackrows: 1,
    scrollbackchar: [111, 108, 100],
    scrollbackcolor: [15, 15, 15],
    scrollbackbg: [0, 0, 0],
    bracketedpaste: false,
    altactive: false,
    digest: `digest-${sessionkey}`,
  }
}

const logs: string[] = []

const devicemock = {
  emit(_player: string, _target: string, _data?: unknown) {},
}

jest.mock('zss/device/api', () => ({
  apilog: (_device: unknown, _player: string, message: string) => {
    logs.push(message)
  },
}))

jest.mock('zss/feature/terminalwritelines', () => ({
  terminalwritelines: (
    _device: unknown,
    _player: string,
    content: string,
  ) => {
    logs.push(content)
  },
}))

jest.mock('zss/device/wanixclient/wanixroom', () => ({
  readwanixroomconfig: () => ({
    mode: 'task',
    mountkey: 0,
    archives: [],
    remotes: [],
    tasks: [{ id: 'hello-wasm', cmd: '#ramfs/hello.wasm' }],
    vm: undefined,
    zedcafe: null,
  }),
}))

describe('wanixsessionmeta', () => {
  beforeEach(() => {
    resetwanixtermbufferfortest()
    resetwanixattachforidle()
  })

  it('labels task sessions from room config', () => {
    expect(readwanixsessionlabel('hello-wasm')).toBe('hello-wasm — hello.wasm')
  })

  it('reads session meta with attach flags', () => {
    applywanixtermread('hello-wasm', makesnapshot('hello-wasm'))
    setwanixactivesession('hello-wasm')
    setattachedsession('hello-wasm')
    const meta = readwanixsessionmeta('hello-wasm')
    expect(meta?.attached).toBe(true)
    expect(meta?.active).toBe(true)
    expect(meta?.scrollbackrows).toBe(1)
    expect(formatwanixtermstatusline(meta!)).toContain('[attached,active]')
  })
})

describe('wanixtermhandlers', () => {
  beforeEach(() => {
    logs.length = 0
    resetwanixtermbufferfortest()
    resetwanixattachforidle()
  })

  it('resolves dump session from attached then active then first key', () => {
    applywanixtermread('a', makesnapshot('a'))
    applywanixtermread('b', makesnapshot('b'))
    expect(resolvewanixtermdumpsession()).toBe('a')
    setwanixactivesession('b')
    expect(resolvewanixtermdumpsession()).toBe('b')
    setattachedsession('a')
    expect(resolvewanixtermdumpsession()).toBe('a')
    expect(resolvewanixtermdumpsession('b')).toBe('b')
  })

  it('writes term status lines', () => {
    applywanixtermread('hello-wasm', makesnapshot('hello-wasm'))
    setattachedsession('hello-wasm')
    writewanixtermstatus(devicemock, 'player')
    expect(logs.some((line) => line.includes('hello-wasm'))).toBe(true)
    expect(logs.some((line) => line.includes('[attached]'))).toBe(true)
  })

  it('writes term dump tail to terminal lines', () => {
    const snapshot = makesnapshot('hello-wasm')
    snapshot.rows = 1
    snapshot.cols = 5
    snapshot.char = [
      'l'.charCodeAt(0),
      'i'.charCodeAt(0),
      'v'.charCodeAt(0),
      'e'.charCodeAt(0),
      32,
    ]
    snapshot.scrollbackrows = 1
    snapshot.scrollbackchar = [
      'o'.charCodeAt(0),
      'l'.charCodeAt(0),
      'd'.charCodeAt(0),
    ]
    applywanixtermread('hello-wasm', snapshot)
    writewanixtermdump(devicemock, 'player', 'hello-wasm', 2)
    expect(logs).toContain('old\nlive')
  })
})
