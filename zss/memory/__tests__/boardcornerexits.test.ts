import { memorycornerexitboardids } from 'zss/memory/boardcornerexits'
import * as boards from 'zss/memory/boards'
import { type BOARD, CORNER_EXIT_DISPUTED } from 'zss/memory/types'

describe('memorycornerexitboardids', () => {
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

  it('returns same id when both cardinal paths agree (NE)', () => {
    mockbyaddr({
      n: { id: 'north', exiteast: 'addr-ne' },
      e: { id: 'east', exitnorth: 'addr-ne' },
      'addr-ne': { id: 'target-ne' },
    })
    const cur = {
      id: 'cur',
      exitnorth: 'n',
      exiteast: 'e',
    } as BOARD
    const r = memorycornerexitboardids(cur)
    expect(r.exitne).toBe('addr-ne')
  })

  it('uses single path when the other hop is missing', () => {
    mockbyaddr({
      n: { id: 'north', exiteast: 'addr-ne' },
      e: { id: 'east' },
      'addr-ne': { id: 'only-ne' },
    })
    const cur = {
      id: 'cur',
      exitnorth: 'n',
      exiteast: 'e',
    } as BOARD
    const r = memorycornerexitboardids(cur)
    expect(r.exitne).toBe('addr-ne')
  })

  it('returns CORNER_EXIT_DISPUTED when both paths resolve but disagree', () => {
    mockbyaddr({
      n: { id: 'north', exiteast: 'addr-a' },
      e: { id: 'east', exitnorth: 'addr-b' },
      'addr-a': { id: 'ida' },
      'addr-b': { id: 'idb' },
    })
    const cur = {
      id: 'cur',
      exitnorth: 'n',
      exiteast: 'e',
    } as BOARD
    const r = memorycornerexitboardids(cur)
    expect(r.exitne).toBe(CORNER_EXIT_DISPUTED)
  })

  it('returns empty string when both paths fail', () => {
    mockbyaddr({
      n: { id: 'north' },
      e: { id: 'east' },
    })
    const cur = {
      id: 'cur',
      exitnorth: 'n',
      exiteast: 'e',
    } as BOARD
    const r = memorycornerexitboardids(cur)
    expect(r.exitne).toBe('')
  })
})
