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
