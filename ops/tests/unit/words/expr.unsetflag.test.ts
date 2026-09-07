import { READ_CONTEXT } from 'zss/words/reader'
import { readexpr } from 'zss/words/expr'

describe('readexpr unset flags', () => {
  afterEach(() => {
    READ_CONTEXT.get = undefined
  })

  it('treats unset chip flags as 0, not the flag name string', () => {
    READ_CONTEXT.get = () => undefined
    READ_CONTEXT.words = ['follower']
    const [value] = readexpr(0)
    expect(value).toBe(0)
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
