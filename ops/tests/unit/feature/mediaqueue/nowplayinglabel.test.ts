import { boardtvmarqueewindow } from 'zss/gadget/boardtvmarqueewindow'
import { mediaqueueformatnowplayinglabel } from 'zss/feature/mediaqueue/nowplayinglabel'

describe('mediaqueueformatnowplayinglabel', () => {
  it('prefers helper detail over queue url', () => {
    expect(
      mediaqueueformatnowplayinglabel(
        'My Video Title',
        'https://www.youtube.com/watch?v=abc123',
      ),
    ).toBe('My Video Title')
  })

  it('falls back to shortened youtube url', () => {
    expect(
      mediaqueueformatnowplayinglabel(
        '',
        'https://www.youtube.com/watch?v=abc123',
      ),
    ).toBe('youtube:abc123')
  })

  it('returns empty when detail and url are missing', () => {
    expect(mediaqueueformatnowplayinglabel('', '')).toBe('')
  })
})

describe('boardtvmarqueewindow', () => {
  it('wraps short labels with padding and scroll offset', () => {
    const w = boardtvmarqueewindow('ABC', 0, 8)
    expect(w.length).toBe(8)
    expect(w.trim()).toBe('ABC')
  })

  it('advances window with negative offset', () => {
    const a = boardtvmarqueewindow('XY', 0, 4)
    const b = boardtvmarqueewindow('XY', -1, 4)
    expect(a).not.toBe(b)
  })
})
