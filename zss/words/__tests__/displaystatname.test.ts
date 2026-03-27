import { mapdisplaystatname } from 'zss/words/displaystatname'

describe('mapdisplaystatname', () => {
  it('returns the same name when usedisplaystats is false', () => {
    expect(mapdisplaystatname(false, 'color')).toBe('color')
    expect(mapdisplaystatname(false, 'char')).toBe('char')
    expect(mapdisplaystatname(false, 'bg')).toBe('bg')
    expect(mapdisplaystatname(false, 'cycle')).toBe('cycle')
  })

  it('maps color, char, and bg to display stats when usedisplaystats is true', () => {
    expect(mapdisplaystatname(true, 'color')).toBe('displaycolor')
    expect(mapdisplaystatname(true, 'char')).toBe('displaychar')
    expect(mapdisplaystatname(true, 'bg')).toBe('displaybg')
  })

  it('leaves other names unchanged when usedisplaystats is true', () => {
    expect(mapdisplaystatname(true, 'displaycolor')).toBe('displaycolor')
    expect(mapdisplaystatname(true, 'cycle')).toBe('cycle')
  })
})
