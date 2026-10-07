import { normalizelineendings } from 'zss/screens/editor/editorinputhelpers'

describe('normalizelineendings', () => {
  it('keeps LF', () => {
    expect(normalizelineendings('a\nb\n')).toBe('a\nb\n')
  })

  it('maps CRLF to a single LF', () => {
    expect(normalizelineendings('a\r\nb\r\n')).toBe('a\nb\n')
  })

  it('maps bare CR to LF', () => {
    expect(normalizelineendings('a\rb\r')).toBe('a\nb\n')
  })

  it('maps unicode line separators to LF', () => {
    expect(normalizelineendings('a\u2028b\u2029c\u0085d')).toBe('a\nb\nc\nd')
  })
})
