import {
  isexpandablelinktype,
  isknownlinktype,
  istargetlesslinktype,
  linkexpandrowheight,
  resolvelinktypeandwords,
} from 'zss/screens/linkui/linktypes'

describe('resolvelinktypeandwords', () => {
  it('resolves target-then-type charedit', () => {
    expect(resolvelinktypeandwords(['char', 'charedit'])).toEqual({
      linktype: 'charedit',
      words: ['char'],
    })
  })

  it('resolves type-first charedit', () => {
    expect(resolvelinktypeandwords(['charedit', 'char'])).toEqual({
      linktype: 'charedit',
      words: ['char'],
    })
  })

  it('pads targetless copyit', () => {
    expect(resolvelinktypeandwords(['copyit', 'hello world'])).toEqual({
      linktype: 'copyit',
      words: ['istargetless', 'hello world'],
    })
  })

  it('keeps padded copyit from scroll queue', () => {
    expect(
      resolvelinktypeandwords(['istargetless', 'copyit', 'hello']),
    ).toEqual({
      linktype: 'copyit',
      words: ['istargetless', 'hello'],
    })
  })

  it('resolves target-then-type hotkey', () => {
    expect(resolvelinktypeandwords(['menu', 'hk', '1', ' A '])).toEqual({
      linktype: 'hk',
      words: ['menu', '1', ' A '],
    })
  })

  it('resolves select target-then-type', () => {
    expect(
      resolvelinktypeandwords(['flag', 'select', 'off', '0', 'on', '1']),
    ).toEqual({
      linktype: 'select',
      words: ['flag', 'off', '0', 'on', '1'],
    })
  })

  it('strips explicit hyperlink type', () => {
    expect(resolvelinktypeandwords(['bookmarkdel', 'hyperlink', 'id'])).toEqual({
      linktype: 'hyperlink',
      words: ['bookmarkdel', 'id'],
    })
  })

  it('plain command is hyperlink', () => {
    expect(resolvelinktypeandwords(['doit', 'now'])).toEqual({
      linktype: 'hyperlink',
      words: ['doit', 'now'],
    })
  })
})

describe('linkexpandrowheight', () => {
  it('is compact unless editing expandable', () => {
    expect(linkexpandrowheight('charedit', false)).toBe(1)
    expect(linkexpandrowheight('hyperlink', true)).toBe(1)
    expect(linkexpandrowheight('charedit', true)).toBeGreaterThan(1)
    expect(linkexpandrowheight('coloredit', true)).toBeGreaterThan(1)
    expect(linkexpandrowheight('bgedit', true)).toBeGreaterThan(1)
  })
})

describe('known / expandable flags', () => {
  it('classifies types', () => {
    expect(isknownlinktype('HK')).toBe(true)
    expect(istargetlesslinktype('copyit')).toBe(true)
    expect(isexpandablelinktype('charedit')).toBe(true)
    expect(isexpandablelinktype('select')).toBe(false)
  })
})
