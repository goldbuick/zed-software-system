jest.mock('zss/config', () => ({
  PERF_UI: false,
}))

jest.mock('zss/perf/ticktimingstats', () => ({
  measurestage: (_name: string, fn: () => unknown) => fn(),
  recordemitdiff: jest.fn(),
}))

jest.mock('zss/device/vm/boardrunnermanagement', () => ({
  boardrunneraccessfor: jest.fn(() => ['boundary-sync']),
}))

jest.mock('zss/device/api', () => ({
  boardrunnerpatch: jest.fn(),
}))

jest.mock('zss/memory/session', () => ({
  memoryreadbookbysoftware: jest.fn(),
}))

jest.mock('zss/memory/boardwait', () => ({
  memorycollecttickboundaries: jest.fn(() => ['boundary-sync']),
}))

jest.mock('zss/memory/boundaries', () => ({
  memoryboundaryget: jest.fn(),
  memoryboundaryset: jest.fn(),
}))

jest.mock('zss/testsupport/hostmemorytrace', () => ({
  ishostmemorytraceenabled: jest.fn(() => false),
  tracehostmemory: jest.fn(),
  tracehostmemorypatch: jest.fn(),
}))

import type { DEVICE } from 'zss/device'
import { boardrunnerpatch } from 'zss/device/api'
import {
  boardrunnerboundarypaint,
  boardrunnerboundarypatch,
  boardrunnerboundarysync,
} from 'zss/device/vm/boardrunnerboundarysync'
import { boardrunners } from 'zss/device/vm/state'
import { memoryboundaryget, memoryboundaryset } from 'zss/memory/boundaries'
import { memoryreadbookbysoftware } from 'zss/memory/session'
import type { BOOK } from 'zss/memory/types'

const stubbook: BOOK = {
  id: 'main',
  name: 'main',
  timestamp: 0,
  activelist: ['runner-a'],
  pages: [],
  flags: {},
}

describe('boardrunnerboundarysync', () => {
  const vm = {} as DEVICE

  beforeEach(() => {
    Object.keys(boardrunners).forEach((key) => delete boardrunners[key])
    boardrunners['board-1'] = 'runner-a'
    jest.mocked(memoryreadbookbysoftware).mockReturnValue(stubbook)
    jest.mocked(memoryboundaryget).mockReturnValue({ layer: 0 })
    jest.mocked(memoryboundaryset).mockClear()
    jest.mocked(boardrunnerpatch).mockClear()
  })

  it('boardrunnerboundarypaint stores boundary doc', () => {
    const doc = { layer: 2, tiles: [] }
    boardrunnerboundarypaint('paint-boundary', doc)
    expect(memoryboundaryset).toHaveBeenCalledWith('paint-boundary', doc)
  })

  it('boardrunnerboundarypatch applies operations after paint', () => {
    const id = 'patch-boundary'
    const doc = { count: 0 }
    boardrunnerboundarypaint(id, doc)
    jest.mocked(memoryboundaryget).mockReturnValue(doc)
    const ok = boardrunnerboundarypatch(id, [
      { op: 'replace', path: '/count', value: 3 },
    ])
    expect(ok).toBe(true)
    expect(memoryboundaryset).toHaveBeenCalledWith(id, { count: 3 })
  })

  it('boardrunnerboundarysync emits patch when boundary changes', () => {
    const id = 'boundary-sync'
    boardrunnerboundarypaint(id, { count: 0 })
    boardrunnerboundarysync(vm)
    jest.mocked(memoryboundaryget).mockReturnValue({ count: 1 })
    boardrunnerboundarysync(vm)
    expect(boardrunnerpatch).toHaveBeenCalledWith(
      vm,
      'runner-a',
      expect.any(Array),
      id,
    )
  })
})
