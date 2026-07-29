import { memorydepth2exitboardids } from 'zss/memory/boarddepth2exits'
import * as boards from 'zss/memory/boards'
import type { BOARD } from 'zss/memory/types'

describe('memorydepth2exitboardids', () => {
  let spy: jest.SpyInstance

  beforeEach(() => {
    spy = jest.spyOn(boards, 'memoryreadboardbyaddress')
  })

  afterEach(() => {
    spy.mockRestore()
  })

  function mockbyaddr(map: Record<string, Partial<BOARD> | undefined>) {
    spy.mockImplementation((addr: string) => {
      const b = map[addr]
      return b as BOARD | undefined
    })
  }

  it('walks cardinal depth-2 east-of-east', () => {
    mockbyaddr({
      e: { id: 'east', exiteast: 'ee' },
      ee: { id: 'eastofeast' },
    })
    const cur = { id: 'cur', exiteast: 'e' } as BOARD
    const r = memorydepth2exitboardids(cur)
    expect(r.exiteast2).toBe('eastofeast')
  })

  it('returns empty when depth-1 neighbor is missing', () => {
    mockbyaddr({})
    const cur = { id: 'cur', exiteast: 'missing' } as BOARD
    const r = memorydepth2exitboardids(cur)
    expect(r.exiteast2).toBe('')
  })

  it('returns empty when depth-1 has no further exit', () => {
    mockbyaddr({
      e: { id: 'east' },
    })
    const cur = { id: 'cur', exiteast: 'e' } as BOARD
    const r = memorydepth2exitboardids(cur)
    expect(r.exiteast2).toBe('')
  })

  it('resolves west north and south depth-2', () => {
    mockbyaddr({
      w: { id: 'west', exitwest: 'ww' },
      ww: { id: 'westofwest' },
      n: { id: 'north', exitnorth: 'nn' },
      nn: { id: 'northofnorth' },
      s: { id: 'south', exitsouth: 'ss' },
      ss: { id: 'southofsouth' },
    })
    const cur = {
      id: 'cur',
      exitwest: 'w',
      exitnorth: 'n',
      exitsouth: 's',
    } as BOARD
    const r = memorydepth2exitboardids(cur)
    expect(r.exitwest2).toBe('westofwest')
    expect(r.exitnorth2).toBe('northofnorth')
    expect(r.exitsouth2).toBe('southofsouth')
  })
})
