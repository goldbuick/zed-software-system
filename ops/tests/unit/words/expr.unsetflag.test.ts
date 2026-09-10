import { READ_CONTEXT } from 'zss/words/reader'
import { readexpr } from 'zss/words/expr'

describe('readexpr unset flags', () => {
  afterEach(() => {
    READ_CONTEXT.get = undefined
  })

  it('returns the flag name string when a chip flag is unset', () => {
    READ_CONTEXT.get = () => undefined
    READ_CONTEXT.words = ['follower']
    const [value] = readexpr(0)
    expect(value).toBe('follower')
  })

  it('still returns present flag values', () => {
    READ_CONTEXT.get = (name: string) =>
      name === 'follower' ? 'oid_seg' : undefined
    READ_CONTEXT.words = ['follower']
    const [value] = readexpr(0)
    expect(value).toBe('oid_seg')
  })

  it('does not coerce :label tokens to 0', () => {
    READ_CONTEXT.get = () => undefined
    READ_CONTEXT.words = [':acceptlink']
    const [value] = readexpr(0)
    expect(value).toBe(':acceptlink')
  })
})
