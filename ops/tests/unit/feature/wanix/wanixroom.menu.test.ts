jest.mock('zss/feature/wanix/wanixbridge', () => ({
  callwanixrpc: jest.fn(),
  registerwanixsessioncloseprune: jest.fn(),
  waitwanixiframe: jest.fn(async () => {}),
  waitwanixready: jest.fn(async () => {}),
}))

jest.mock('zss/feature/wanix/wanixtermbuffer', () => ({
  readwanixtermbufferkeys: jest.fn(() => []),
}))

jest.mock('zss/feature/wanix/wanixattachstate', () => ({
  readattachedsession: jest.fn(() => null),
  readwanixactivesession: jest.fn(() => null),
}))

import { callwanixrpc } from 'zss/feature/wanix/wanixbridge'
import { applywanixroom, readwanixmenustate } from 'zss/feature/wanix/wanixroom'

const mockrpc = callwanixrpc as jest.Mock

const taskconfig = {
  mode: 'task' as const,
  mountkey: 1,
  archives: [],
  remotes: [],
  tasks: [{ id: 'hello-wasm', cmd: '#ramfs/hello.wasm' }],
}

describe('readwanixmenustate', () => {
  beforeEach(async () => {
    mockrpc.mockReset()
    mockrpc.mockResolvedValue(null)
    await applywanixroom(taskconfig)
  })

  it('returns stalled menu state without inventing vm status on rpc failure', async () => {
    mockrpc.mockRejectedValue(new Error('wanix menu timeout'))
    const state = await readwanixmenustate(50)
    expect(state.stalled).toBe(true)
    expect(state.ready).toBe(false)
    expect(state.vmrunning).toBe(false)
    expect(state.vm).toBeNull()
  })
})
