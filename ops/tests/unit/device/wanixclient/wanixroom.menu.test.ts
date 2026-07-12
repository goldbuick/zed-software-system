jest.mock('zss/device/api', () => {
  const actual = jest.requireActual('zss/device/api')
  return {
    ...actual,
    wanixserverapplyroom: jest.fn(),
    wanixserverreadroomstatus: jest.fn(),
    wanixserverreadvmstatus: jest.fn(),
  }
})

jest.mock('zss/device/wanixclient/wanixtermbuffer', () => ({
  readwanixtermbufferkeys: jest.fn(() => []),
}))

jest.mock('zss/device/wanixclient/wanixdisplay', () => ({
  readattachedsession: jest.fn(() => null),
  readwanixactivesession: jest.fn(() => null),
}))

jest.mock('zss/device/wanixclient/wanixbridge', () => ({
  registerwanixsessioncloseprune: jest.fn(),
  iswanixready: jest.fn(() => true),
  onwanixready: jest.fn((cb: () => void) => cb()),
}))

import {
  applywanixroom,
  readwanixmenustate,
} from 'zss/device/wanixclient/wanixroom'

const taskconfig = {
  mode: 'task' as const,
  mountkey: 1,
  archives: [],
  remotes: [],
  tasks: [{ id: 'hello-wasm', cmd: '#ramfs/hello.wasm' }],
}

describe('readwanixmenustate', () => {
  beforeEach(() => {
    applywanixroom(taskconfig)
  })

  it('returns local menu snapshot without inventing vm status', () => {
    const state = readwanixmenustate()
    expect(state.stalled).toBe(false)
    expect(state.ready).toBe(false)
    expect(state.config.mode).toBe('task')
  })
})
