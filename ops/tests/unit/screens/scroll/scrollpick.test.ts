import { scrolltextlineclosesonenter } from 'zss/screens/scroll/scrollpick'

describe('scrolltextlineclosesonenter', () => {
  it('is true for a plain text line in the scroll panel', () => {
    expect(scrolltextlineclosesonenter('hello', false)).toBe(true)
  })

  it('is false for a hyperlink array', () => {
    expect(
      scrolltextlineclosesonenter(['chip', 'label', 'hk', 'target'], false),
    ).toBe(false)
  })

  it('is false for a sidebar text line', () => {
    expect(scrolltextlineclosesonenter('hello', true)).toBe(false)
  })
})
