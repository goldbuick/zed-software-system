import { READ_CONTEXT } from 'zss/words/reader'
import { readexpr } from 'zss/words/expr'

describe('readexpr intsign', () => {
  it('returns 1 for positive numbers', () => {
    READ_CONTEXT.words = ['intsign', 5]
    const [value] = readexpr(0)
    expect(value).toBe(1)
  })

  it('returns -1 for negative numbers', () => {
    READ_CONTEXT.words = ['intsign', -3]
    const [value] = readexpr(0)
    expect(value).toBe(-1)
  })

  it('returns 0 for zero', () => {
    READ_CONTEXT.words = ['intsign', 0]
    const [value] = readexpr(0)
    expect(value).toBe(0)
  })
})
