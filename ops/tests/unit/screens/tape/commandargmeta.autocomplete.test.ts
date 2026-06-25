import { keywordsforcommandargcomplete } from 'zss/screens/tape/autocomplete'

describe('keywordsforcommandargcomplete', () => {
  it('uses byposition for arg index 1', () => {
    const meta = {
      byposition: [[], ['alpha', 'beta']],
    }
    expect(keywordsforcommandargcomplete(meta, 1, 'ignored')).toEqual([
      'alpha',
      'beta',
    ])
  })

  it('prefers whenfirst row for arg index when first arg matches', () => {
    const meta = {
      byposition: [[], ['frombase']],
      whenfirst: {
        mode: [[], ['x', 'y']],
      },
    }
    expect(keywordsforcommandargcomplete(meta, 1, 'mode')).toEqual(['x', 'y'])
    expect(keywordsforcommandargcomplete(meta, 1, 'other')).toEqual([
      'frombase',
    ])
  })

  it('uses byposition for arg 0 without whenfirst branch', () => {
    const meta = {
      byposition: [['a', 'b']],
      whenfirst: { mode: [['only', 'variant']] },
    }
    expect(keywordsforcommandargcomplete(meta, 0, '')).toEqual(['a', 'b'])
  })

  it('returns undefined when no list applies', () => {
    expect(keywordsforcommandargcomplete(undefined, 0, '')).toBeUndefined()
    expect(keywordsforcommandargcomplete({}, 0, '')).toBeUndefined()
  })
})
