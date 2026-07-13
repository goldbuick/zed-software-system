import { wanixserverapplyroom } from 'zss/device/api'
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

const mockapplyroom = wanixserverapplyroom as jest.Mock

describe('wanix remote connect', () => {
  beforeEach(() => {
    setwanixroomconfig(createidleroomconfig())
    mockapplyroom.mockClear()
  })

  it('connectwanixremote stands up task room when idle', () => {
    const remote = connectwanixremote('wss://127.0.0.1:7654/', 'host')
    expect(remote.dst).toBe('host')
    expect(remote.url).toBe('wss://127.0.0.1:7654/')
    expect(readwanixremotes()).toEqual([remote])
    expect(readwanixroomconfig().mode).toBe('task')
    expect(mockapplyroom).toHaveBeenCalled()
    const applied = mockapplyroom.mock.calls[0][2] as {
      mode?: string
      remotes?: { dst: string }[]
    }
    expect(applied.mode).toBe('task')
    expect(applied.remotes?.map((entry) => entry.dst)).toEqual(['host'])
  })

  it('connectwanixremote defaults dst to remote', () => {
    const remote = connectwanixremote('wss://127.0.0.1:9/')
    expect(remote.dst).toBe(DEFAULT_WANIX_REMOTE_DST)
  })

  it('connectwanixremote rejects non-wss urls', () => {
    expect(() => connectwanixremote('ws://127.0.0.1:9/')).toThrow(/wss:\/\//)
    expect(() => connectwanixremote('http://example/')).toThrow(/wss:\/\//)
  })

  it('connectwanixremote rejects spaces in dst', () => {
    expect(() => connectwanixremote('wss://x/', 'bad dst')).toThrow(/spaces/)
  })

  it('disconnectwanixremote removes by dst', () => {
    connectwanixremote('wss://127.0.0.1:1/', 'a')
    connectwanixremote('wss://127.0.0.1:2/', 'b')
    disconnectwanixremote('a')
    expect(readwanixremotes().map((r) => r.dst)).toEqual(['b'])
  })

  it('soft stopwanixroom preserves remotes', () => {
    connectwanixremote('wss://127.0.0.1:1/')
    expect(readwanixroomconfig().mode).toBe('task')
    stopwanixroom(false)
    expect(readwanixroomconfig().mode).toBe('idle')
    expect(readwanixremotes()).toHaveLength(1)
  })

  it('hard stopwanixroom clears remotes', () => {
    connectwanixremote('wss://127.0.0.1:1/')
    expect(readwanixroomconfig().mode).toBe('task')
    stopwanixroom(true)
    expect(readwanixremotes()).toHaveLength(0)
  })

  it('applywanixroomresult demotes to idle on apply failure', async () => {
    const { applywanixroomresult } = await import(
      'zss/device/wanixclient/wanixroom'
    )
    setwanixroomconfig({
      ...createidleroomconfig(),
      mode: 'task',
      remotes: [
        { id: 'remote-remote', dst: 'remote', url: 'wss://localhost:8765/' },
      ],
    })
    applywanixroomresult(undefined, 'test-player', {
      ok: false,
      error: 'wanix remote wss timeout',
    })
    expect(readwanixroomconfig().mode).toBe('idle')
    expect(readwanixremotes()).toHaveLength(1)
  })
})
