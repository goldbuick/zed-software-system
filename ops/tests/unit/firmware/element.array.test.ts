import type { CHIP } from 'zss/chip'
import { DRIVER_TYPE, firmwaregetcommand } from 'zss/firmware/runner'
import { READ_CONTEXT } from 'zss/words/reader'

function handler(name: string) {
  const command = firmwaregetcommand(DRIVER_TYPE.RUNTIME, name)
  if (!command) {
    throw new Error(`missing command ${name}`)
  }
  return command
}

function makechip(flags: Record<string, any>): CHIP {
  const get = (name: string) => flags[name]
  READ_CONTEXT.get = get
  return {
    get,
    set(name: string, value: any) {
      flags[name] = value
      return value
    },
  } as CHIP
}

describe('array and clear', () => {
  afterEach(() => {
    READ_CONTEXT.get = undefined
  })

  it('stores an empty array when #array has no values', () => {
    const flags: Record<string, any> = {}
    handler('array')(makechip(flags), ['thing'])
    expect(flags.thing).toEqual([])
  })

  it('spreads an existing array so #array thing thing apple appends', () => {
    const flags: Record<string, any> = { thing: ['a', 'b'] }
    handler('array')(makechip(flags), ['thing', 'thing', 'apple'])
    expect(flags.thing).toEqual(['a', 'b', 'apple'])
  })

  it('keeps a direction array as one item', () => {
    const flags: Record<string, any> = { heading: ['NORTH'] }
    handler('array')(makechip(flags), ['bag', 'heading'])
    expect(flags.bag).toEqual([['NORTH']])
  })

  it('spreads only one level', () => {
    const flags: Record<string, any> = { thing: [['a'], 'b'] }
    handler('array')(makechip(flags), ['thing', 'thing'])
    expect(flags.thing).toEqual([['a'], 'b'])
  })

  it('sets named flags to 0 when #clear has no index', () => {
    const flags: Record<string, any> = { thing: ['a'], other: 4 }
    handler('clear')(makechip(flags), ['thing', 'other'])
    expect(flags.thing).toBe(0)
    expect(flags.other).toBe(0)
  })

  it('drops the given index and leaves the stored array untouched', () => {
    const original = ['a', 'b', 'c']
    const flags: Record<string, any> = { thing: original }
    handler('clear')(makechip(flags), ['thing', 1])
    expect(flags.thing).toEqual(['a', 'c'])
    expect(original).toEqual(['a', 'b', 'c'])
  })

  it('sets didfail when the index is past the end', () => {
    const flags: Record<string, any> = { thing: ['a'] }
    expect(handler('clear')(makechip(flags), ['thing', 3])).toBe(0)
    expect(flags.thing).toEqual(['a'])
    expect(flags.didfail).toBe(1)
  })

  it('sets didfail when the flag is not an array', () => {
    const flags: Record<string, any> = { thing: 'nope' }
    expect(handler('clear')(makechip(flags), ['thing', 0])).toBe(0)
    expect(flags.thing).toBe('nope')
    expect(flags.didfail).toBe(1)
  })
})
