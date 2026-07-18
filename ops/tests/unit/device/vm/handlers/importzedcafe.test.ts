jest.mock('zss/device/api', () => ({
  wanixclientimportresult: jest.fn(),
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
  applyzedcafepartialtomemory: jest.fn(() => ({
    changed: true,
    paintids: ['page-1'],
    bookcount: 1,
    changedpaths: [],
    skippedpaths: [],
  })),
  parsezedcafeexportfiles: jest.fn(() => ({ books: [{ id: 'b1' }] })),
}))

jest.mock('zss/feature/wanix/wanixstateexport', () => ({
  primezedcafeexportshadow: jest.fn(),
  readexportrevision: jest.fn(() => 1),
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
import { boardrunnerpaint, wanixclientimportresult } from 'zss/device/api'
import { boardrunnerboundarypaint } from 'zss/device/vm/boardrunnerboundarysync'
import { handleimportzedcafe } from 'zss/device/vm/handlers/importzedcafe'
import {
  applyzedcafepartialtomemory,
  applyzedcafetomemory,
} from 'zss/feature/wanix/wanixstateimport'

describe('handleimportzedcafe', () => {
  const vm = {} as DEVICE
  const message: MESSAGE = {
    session: '',
    player: 'p1',
    id: 'id',
    sender: '',
    target: 'importzedcafe',
    data: {
      files: [{ path: 'stats.json', bytes: new Uint8Array([1]) }],
    },
  }

  beforeEach(() => {
    jest.mocked(boardrunnerpaint).mockClear()
    jest.mocked(boardrunnerboundarypaint).mockClear()
    jest.mocked(wanixclientimportresult).mockClear()
    jest.mocked(applyzedcafetomemory).mockClear()
    jest.mocked(applyzedcafepartialtomemory).mockClear()
    jest.mocked(applyzedcafetomemory).mockReturnValue(true)
    jest.mocked(applyzedcafepartialtomemory).mockReturnValue({
      changed: true,
      paintids: ['page-1'],
      bookcount: 1,
      changedpaths: [],
      skippedpaths: [],
    })
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
    expect(wanixclientimportresult).toHaveBeenCalledWith(
      vm,
      'p1',
      true,
      true,
      undefined,
      1,
      { revision: 1 },
    )
  })

  it('skips boardrunner paint when apply did not change', () => {
    jest.mocked(applyzedcafetomemory).mockReturnValue(false)
    handleimportzedcafe(vm, message)
    expect(boardrunnerpaint).not.toHaveBeenCalled()
    expect(boardrunnerboundarypaint).not.toHaveBeenCalled()
    expect(wanixclientimportresult).toHaveBeenCalledWith(
      vm,
      'p1',
      true,
      false,
      undefined,
      1,
      { revision: 1 },
    )
  })

  it('paints only touched boundaries for partial import', () => {
    jest.mocked(applyzedcafepartialtomemory).mockReturnValue({
      changed: true,
      paintids: ['page-1'],
      bookcount: 2,
      changedpaths: ['demo-b1/p/board/terrain.json'],
      skippedpaths: [],
    })
    handleimportzedcafe(vm, {
      ...message,
      data: {
        files: [{ path: 'demo-b1/p/board/terrain.json', bytes: new Uint8Array([1]) }],
        partial: true,
        removepaths: [],
      },
    })
    expect(applyzedcafepartialtomemory).toHaveBeenCalled()
    expect(applyzedcafetomemory).not.toHaveBeenCalled()
    expect(boardrunnerboundarypaint).toHaveBeenCalledWith(
      'page-1',
      expect.any(Object),
    )
    expect(wanixclientimportresult).toHaveBeenCalledWith(
      vm,
      'p1',
      true,
      true,
      undefined,
      2,
      {
        revision: 1,
        changedpaths: ['demo-b1/p/board/terrain.json'],
        skippedpaths: [],
      },
    )
  })
})
