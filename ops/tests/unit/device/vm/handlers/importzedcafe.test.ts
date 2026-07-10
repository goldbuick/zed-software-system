jest.mock('zss/device/api', () => ({
  waniximportresult: jest.fn(),
}))

jest.mock('zss/device/vm/boardrunnerpushupdates', () => ({
  boardrunnerpushupdates: jest.fn(),
}))

jest.mock('zss/feature/wanix/wanixstateimport', () => ({
  applyzedcafetomemory: jest.fn(() => true),
  parsezedcafeexportfiles: jest.fn(() => ({ books: [{ id: 'b1' }] })),
}))

jest.mock('zss/feature/wanix/wanixstateexport', () => ({
  primezedcafeexportshadow: jest.fn(),
}))

jest.mock('zss/feature/wanix/zedcafetreeschema', () => ({
  validatezedcafeexportpaths: jest.fn(() => ({ ok: true, errors: [] })),
}))

jest.mock('zss/memory/session', () => ({
  memorywritefrozen: jest.fn(),
}))

import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { waniximportresult } from 'zss/device/api'
import { boardrunnerpushupdates } from 'zss/device/vm/boardrunnerpushupdates'
import { handleimportzedcafe } from 'zss/device/vm/handlers/importzedcafe'
import { applyzedcafetomemory } from 'zss/feature/wanix/wanixstateimport'

describe('handleimportzedcafe', () => {
  const vm = {} as DEVICE
  const message: MESSAGE = {
    session: '',
    player: 'p1',
    id: 'id',
    sender: '',
    target: 'import-zedcafe',
    data: {
      files: [{ path: 'stats.json', bytes: new Uint8Array([1]) }],
    },
  }

  beforeEach(() => {
    jest.mocked(boardrunnerpushupdates).mockClear()
    jest.mocked(waniximportresult).mockClear()
    jest.mocked(applyzedcafetomemory).mockReturnValue(true)
  })

  it('pushes boardrunner updates when apply changed', () => {
    handleimportzedcafe(vm, message)
    expect(boardrunnerpushupdates).toHaveBeenCalledWith(vm)
    expect(waniximportresult).toHaveBeenCalledWith(
      vm,
      'p1',
      expect.objectContaining({ ok: true, changed: true }),
    )
  })

  it('skips boardrunner push when apply did not change', () => {
    jest.mocked(applyzedcafetomemory).mockReturnValue(false)
    handleimportzedcafe(vm, message)
    expect(boardrunnerpushupdates).not.toHaveBeenCalled()
    expect(waniximportresult).toHaveBeenCalledWith(
      vm,
      'p1',
      expect.objectContaining({ ok: true, changed: false }),
    )
  })
})
