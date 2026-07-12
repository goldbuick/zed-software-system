jest.mock('zss/device/wanixclient/wanixroom', () => ({
  readwanixroomconfig: jest.fn(() => ({ mode: 'idle' })),
}))

jest.mock('zss/feature/wanix/wanixstateexport', () => ({
  buildzedcafeexportfiles: jest.fn(() => [
    {
      path: 'stats.json',
      bytes: new TextEncoder().encode('{"bookCount":0,"books":[]}\n'),
    },
  ]),
  readbookcountfromexportfiles: jest.fn(() => 0),
  zedcafeexportfilestodoc: jest.fn(() => ({})),
  zedcafeexportdocsdiffer: jest.fn(() => false),
}))

import { readwanixbootzedcafestatefrommemory } from 'zss/device/wanixclient/wanixzedcafe'
import { WANIX_ZEDCAFE_WASM_CMD } from 'zss/feature/wanix/wanixzedcafeconstants'

describe('wanixzedcafe boot state', () => {
  it('returns boot spec without inboxbytes', () => {
    const state = readwanixbootzedcafestatefrommemory()
    expect(state.cmd).toBe(WANIX_ZEDCAFE_WASM_CMD)
    expect(state.generation).toBe(1)
    expect(state.ready).toBe(false)
    expect(state.taskrid).toBeNull()
    expect(state).not.toHaveProperty('inboxbytes')
    expect(state).not.toHaveProperty('guestfiles')
  })
})
