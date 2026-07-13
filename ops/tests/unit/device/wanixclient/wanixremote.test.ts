import {
  connectwanixremote,
  disconnectwanixremote,
  readwanixremotes,
  readwanixroomconfig,
  stopwanixroom,
} from 'zss/device/wanixclient/wanixroom'
import { setwanixroomconfig } from 'zss/device/wanixclient/state'
import {
  DEFAULT_WANIX_REMOTE_DST,
  createidleroomconfig,
} from 'zss/feature/wanix/wanixroomtypes'

jest.mock('zss/device/api', () => ({
  apilog: jest.fn(),
  wanixserverapplyroom: jest.fn(),
  wanixserverhalttask: jest.fn(),
  wanixserverreadvmstatus: jest.fn(),
  wanixserverspawntask: jest.fn(),
  wanixserverstopvm: jest.fn(),
  wanixserverwritefile: jest.fn(),
  wanixserverbinddrop: jest.fn(),
}))

jest.mock('zss/device/registerplayer', () => ({
  registerreadplayer: () => 'test-player',
}))

jest.mock('zss/device/wanixclient/wanixactivateexport', () => ({
  activatewanixzedcafeexport: jest.fn(),
}))

jest.mock('zss/device/wanixclient/wanixzedcafe', () => ({
  readwanixbootzedcafestate: () => ({
    cmd: 'zedcafe.wasm',
    generation: 1,
  }),
  resetwanixzedcafeonidle: jest.fn(),
}))

describe('wanix remote connect', () => {
  beforeEach(() => {
    setwanixroomconfig(createidleroomconfig())
  })

  it('connectwanixremote stores remotes while idle', () => {
    const remote = connectwanixremote('ws://127.0.0.1:7654/', 'host')
    expect(remote.dst).toBe('host')
    expect(remote.url).toBe('ws://127.0.0.1:7654/')
    expect(readwanixremotes()).toEqual([remote])
    expect(readwanixroomconfig().mode).toBe('idle')
  })

  it('connectwanixremote defaults dst to remote', () => {
    const remote = connectwanixremote('ws://127.0.0.1:9/')
    expect(remote.dst).toBe(DEFAULT_WANIX_REMOTE_DST)
  })

  it('connectwanixremote rejects spaces in dst', () => {
    expect(() => connectwanixremote('ws://x/', 'bad dst')).toThrow(/spaces/)
  })

  it('disconnectwanixremote removes by dst', () => {
    connectwanixremote('ws://127.0.0.1:1/', 'a')
    connectwanixremote('ws://127.0.0.1:2/', 'b')
    disconnectwanixremote('a')
    expect(readwanixremotes().map((r) => r.dst)).toEqual(['b'])
  })

  it('soft stopwanixroom preserves remotes', () => {
    connectwanixremote('ws://127.0.0.1:1/')
    setwanixroomconfig({
      ...readwanixroomconfig(),
      mode: 'task',
    })
    stopwanixroom(false)
    expect(readwanixroomconfig().mode).toBe('idle')
    expect(readwanixremotes()).toHaveLength(1)
  })

  it('hard stopwanixroom clears remotes', () => {
    connectwanixremote('ws://127.0.0.1:1/')
    setwanixroomconfig({
      ...readwanixroomconfig(),
      mode: 'task',
    })
    stopwanixroom(true)
    expect(readwanixremotes()).toHaveLength(0)
  })
})
