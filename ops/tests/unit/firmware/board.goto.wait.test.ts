import { firmwarewaitforboard } from 'zss/firmware/boardwaitsync'
import { memoryreadboardbyaddress } from 'zss/memory/boards'
import { memoryisboardready } from 'zss/memory/boardwait'
import { memorycreatebook } from 'zss/memory/bookoperations'
import {
  memoryboundariesclear,
  memoryboundaryset,
} from 'zss/memory/boundaries'
import { memorycreatecodepage } from 'zss/memory/codepageoperations'
import { memorypickcodepagewithtypeandstat } from 'zss/memory/codepages'
import { memoryresetbooks } from 'zss/memory/session'
import type { BOARD, CODE_PAGE_RUNTIME } from 'zss/memory/types'
import { CODE_PAGE_TYPE } from 'zss/memory/types'

const vmboardrunneraccess = jest.fn()

jest.mock('zss/device/api', () => ({
  vmboardrunneraccess: (...args: unknown[]) => vmboardrunneraccess(...args),
}))

jest.mock('zss/memory/session', () => {
  const actual = jest.requireActual('zss/memory/session')
  return {
    ...actual,
    memoryreadboardrunner: () => 'runner-1',
    memoryreadassignedboard: () => 'board-here',
  }
})

describe('goto board wait ordering', () => {
  afterEach(() => {
    memoryboundariesclear()
    memoryresetbooks([])
    vmboardrunneraccess.mockClear()
  })

  function setupcolddest() {
    const page = memorycreatecodepage('@board dest\n', {})
    const book = memorycreatebook([page])
    book.name = 'main'
    memoryresetbooks([book])
    memoryboundariesclear()
    return page
  }

  it('read-before-wait poisons ready with an empty stub', () => {
    const page = setupcolddest()

    expect(memoryisboardready(page.id)).toBe(false)

    const stub = memoryreadboardbyaddress('dest')
    expect(stub).toBeDefined()
    expect(memoryisboardready(page.id)).toBe(true)
    expect(Object.keys(stub?.objects ?? {})).toHaveLength(0)
    // wait would no longer block -- passage matching would see an empty board
    expect(firmwarewaitforboard(page.id)).toBe(false)
    expect(vmboardrunneraccess).not.toHaveBeenCalled()
  })

  it('pick+wait before read keeps waiting until real board is painted', () => {
    const page = setupcolddest()

    const targetpage = memorypickcodepagewithtypeandstat(
      CODE_PAGE_TYPE.BOARD,
      'dest',
    )
    expect(targetpage?.id).toBe(page.id)
    expect(memoryisboardready(page.id)).toBe(false)

    expect(firmwarewaitforboard(targetpage!.id)).toBe(true)
    expect(vmboardrunneraccess).toHaveBeenCalled()

    const painted: BOARD = {
      id: page.id,
      name: 'dest',
      terrain: [],
      objects: {
        passage1: {
          id: 'passage1',
          name: 'passage',
          x: 3,
          y: 7,
          kind: 'passage',
          runtime: '',
        },
      },
    }
    memoryboundaryset(page.id, { board: painted } as CODE_PAGE_RUNTIME)

    expect(firmwarewaitforboard(targetpage!.id)).toBe(false)
    const targetboard = memoryreadboardbyaddress('dest')
    expect(targetboard?.objects.passage1?.x).toBe(3)
    expect(targetboard?.objects.passage1?.y).toBe(7)
  })
})
