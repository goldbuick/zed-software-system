jest.mock('zss/config', () => ({
  PERF_UI: false,
}))

jest.mock('zss/perf/ticktimingstats', () => ({
  measurestage: (_name: string, fn: () => unknown) => fn(),
  recordemitdiff: jest.fn(),
}))

jest.mock('zss/device/api', () => ({
  boardrunnerpatch: jest.fn(),
}))

jest.mock('zss/memory/session', () => ({
  memoryreadbookbysoftware: jest.fn(),
  memoryreadroot: jest.fn(),
}))

import type { DEVICE } from 'zss/device'
import { boardrunnerpatch } from 'zss/device/api'
import { boardrunneremitpatch } from 'zss/device/vm/boardrunnermemorysync'
import { boardrunners } from 'zss/device/vm/state'
import { memoryreadbookbysoftware } from 'zss/memory/session'
import type { BOOK } from 'zss/memory/types'

const stubbook: BOOK = {
  id: 'main',
  name: 'main',
  timestamp: 0,
  activelist: ['runner-a', 'runner-b'],
  pages: [],
  flags: {},
}

describe('boardrunnermemorysync', () => {
  const vm = {} as DEVICE

  beforeEach(() => {
    Object.keys(boardrunners).forEach((key) => delete boardrunners[key])
    boardrunners['board-1'] = 'runner-a'
    boardrunners['board-2'] = 'runner-b'
    jest.mocked(memoryreadbookbysoftware).mockReturnValue(stubbook)
    jest.mocked(boardrunnerpatch).mockClear()
  })

  it('boardrunneremitpatch skips empty operations', () => {
    boardrunneremitpatch(vm, [], '')
    expect(boardrunnerpatch).not.toHaveBeenCalled()
  })

  it('boardrunneremitpatch fans out to elected runners except skip player', () => {
    boardrunneremitpatch(
      vm,
      [{ op: 'replace', path: '/x', value: 1 }],
      'runner-a',
    )
    expect(boardrunnerpatch).toHaveBeenCalledTimes(1)
    expect(boardrunnerpatch).toHaveBeenCalledWith(
      vm,
      'runner-b',
      expect.any(Array),
      undefined,
    )
  })
})
