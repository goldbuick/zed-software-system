import {
  memoryboundariesclear,
  memoryboundaryalloc,
  memoryboundaryget,
} from '../boundaries'

describe('memoryboundaryalloc', () => {
  afterEach(() => {
    memoryboundariesclear()
  })

  it('uses optional id when key is free', () => {
    const id = memoryboundaryalloc({ x: 1 }, 'mykey')
    expect(id).toBe('mykey')
    expect(memoryboundaryget('mykey')).toEqual({ x: 1 })
  })

  it('falls back to a new id when optional id is already taken', () => {
    memoryboundaryalloc({ first: true }, 'same')
    const second = memoryboundaryalloc({ second: true }, 'same')
    expect(second).not.toBe('same')
    expect(memoryboundaryget('same')).toEqual({ first: true })
    expect(memoryboundaryget(second)).toEqual({ second: true })
  })

  it('ignores empty string optional id', () => {
    const id = memoryboundaryalloc({ z: 3 }, '')
    expect(id).not.toBe('')
    expect(memoryboundaryget(id)).toEqual({ z: 3 })
  })
})
