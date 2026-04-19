import * as boards from 'zss/memory/boards'
import type { BOOK } from 'zss/memory/types'

import {
  DEBUG_ACTIVELIST_BOARD_INVARIANT_KEY,
  memorydebugassertactivelistboardinvariantifenabled,
} from '../debugactivelistinvariant'

describe('memorydebugassertactivelistboardinvariantifenabled', () => {
  let store: Record<string, string>
  let boardspy: jest.SpiedFunction<typeof boards.memoryreadboardbyaddress>
  let warnspy: jest.SpyInstance

  beforeEach(() => {
    store = {}
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (key: string) =>
          Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null,
        setItem: (key: string, value: string) => {
          store[key] = value
        },
      },
      configurable: true,
    })
    boardspy = jest.spyOn(boards, 'memoryreadboardbyaddress').mockReturnValue({
      id: 'board-x',
      name: 'x',
      terrain: [],
      objects: {},
    })
    warnspy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    delete (globalThis as { __ZSS_THROW_ACTIVELIST_INVARIANT?: boolean })
      .__ZSS_THROW_ACTIVELIST_INVARIANT
  })

  afterEach(() => {
    boardspy.mockRestore()
    warnspy.mockRestore()
  })

  it('is a no-op when localStorage flag is unset', () => {
    const book: BOOK = {
      id: 'b',
      name: 'b',
      timestamp: 0,
      activelist: ['p1'],
      pages: [],
      flags: { p1: { board: '' } },
    }
    memorydebugassertactivelistboardinvariantifenabled(book)
    expect(warnspy).not.toHaveBeenCalled()
  })

  it('warns when an activelist pid has an empty board flag', () => {
    store[DEBUG_ACTIVELIST_BOARD_INVARIANT_KEY] = '1'
    const book: BOOK = {
      id: 'b',
      name: 'b',
      timestamp: 0,
      activelist: ['p1'],
      pages: [],
      flags: { p1: { board: '' } },
    }
    memorydebugassertactivelistboardinvariantifenabled(book)
    expect(warnspy).toHaveBeenCalled()
  })

  it('warns when board flag does not resolve', () => {
    store[DEBUG_ACTIVELIST_BOARD_INVARIANT_KEY] = '1'
    boardspy.mockReturnValue(undefined)
    const book: BOOK = {
      id: 'b',
      name: 'b',
      timestamp: 0,
      activelist: ['p1'],
      pages: [],
      flags: { p1: { board: 'missing' } },
    }
    memorydebugassertactivelistboardinvariantifenabled(book)
    expect(warnspy).toHaveBeenCalled()
  })

  it('throws when __ZSS_THROW_ACTIVELIST_INVARIANT is true', () => {
    store[DEBUG_ACTIVELIST_BOARD_INVARIANT_KEY] = '1'
    ;(
      globalThis as { __ZSS_THROW_ACTIVELIST_INVARIANT?: boolean }
    ).__ZSS_THROW_ACTIVELIST_INVARIANT = true
    const book: BOOK = {
      id: 'b',
      name: 'b',
      timestamp: 0,
      activelist: ['p1'],
      pages: [],
      flags: { p1: { board: '' } },
    }
    expect(() =>
      memorydebugassertactivelistboardinvariantifenabled(book),
    ).toThrow(/activelist invariant/)
  })
})
