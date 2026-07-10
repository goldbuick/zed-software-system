jest.mock('zss/device/api', () => ({
  waniximportresult: jest.fn(),
  boardrunnerpaint: jest.fn(),
}))

jest.mock('zss/device/vm/boardrunnerboundarysync', () => ({
  boardrunnerboundarypaint: jest.fn(),
}))

jest.mock('zss/device/vm/boardrunnermanagement', () => ({
  boardrunneraccessfor: jest.fn((board: string) => [board]),
}))

jest.mock('zss/device/vm/state', () => ({
  boardrunners: { 'page-1': 'player-1' },
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

jest.mock('zss/memory/boardwait', () => ({
  memorycollecttickboundaries: jest.fn(() => ['page-1']),
}))

jest.mock('zss/memory/boundaries', () => ({
  memoryboundaryget: jest.fn(() => ({ board: { id: 'page-1', terrain: [] } })),
}))

jest.mock('zss/memory/session', () => ({
  memorywritefrozen: jest.fn(),
  memoryreadbookbysoftware: jest.fn(() => ({ id: 'main', pages: [] })),
}))

import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { boardrunnerpaint, waniximportresult } from 'zss/device/api'
import { boardrunnerboundarypaint } from 'zss/device/vm/boardrunnerboundarysync'
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
    jest.mocked(boardrunnerpaint).mockClear()
    jest.mocked(boardrunnerboundarypaint).mockClear()
    jest.mocked(waniximportresult).mockClear()
    jest.mocked(applyzedcafetomemory).mockReturnValue(true)
  })

  it('paints boardrunner boundaries when apply changed', () => {
    handleimportzedcafe(vm, message)
    expect(boardrunnerboundarypaint).toHaveBeenCalledWith(
      'page-1',
      expect.any(Object),
    )
    expect(boardrunnerpaint).toHaveBeenCalledWith(
      vm,
      'player-1',
      expect.any(Object),
      'page-1',
    )
    expect(waniximportresult).toHaveBeenCalledWith(
      vm,
      'p1',
      true,
      true,
      undefined,
      1,
    )
  })

  it('skips boardrunner paint when apply did not change', () => {
    jest.mocked(applyzedcafetomemory).mockReturnValue(false)
    handleimportzedcafe(vm, message)
    expect(boardrunnerpaint).not.toHaveBeenCalled()
    expect(boardrunnerboundarypaint).not.toHaveBeenCalled()
    expect(waniximportresult).toHaveBeenCalledWith(
      vm,
      'p1',
      true,
      false,
      undefined,
      1,
    )
  })
})
