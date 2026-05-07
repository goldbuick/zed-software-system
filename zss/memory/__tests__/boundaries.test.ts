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

  it('overwrites payload when optional id is reused', () => {
    memoryboundaryalloc({ first: true }, 'same')
    const second = memoryboundaryalloc({ second: true }, 'same')
    expect(second).toBe('same')
    expect(memoryboundaryget('same')).toEqual({ second: true })
  })

  it('ignores empty string optional id', () => {
    const id = memoryboundaryalloc({ z: 3 }, '')
    expect(id).not.toBe('')
    expect(memoryboundaryget(id)).toEqual({ z: 3 })
  })
})
