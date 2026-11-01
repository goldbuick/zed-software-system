import { textfromimportbytes } from 'zss/feature/parse/textfromimportbytes'

describe('textfromimportbytes', () => {
  it('round-trips utf-8 hello', () => {
    const bytes = new TextEncoder().encode('hello')
    expect(textfromimportbytes(bytes)).toBe('hello')
  })

  it('round-trips utf-8 cafe', () => {
    const bytes = new TextEncoder().encode('café')
    expect(textfromimportbytes(bytes)).toBe('café')
  })

  it('decodes a lone cp437 high byte as charset index 176', () => {
    const text = textfromimportbytes(new Uint8Array([0xb0]))
    expect(text).toHaveLength(1)
    expect(text.charCodeAt(0)).toBe(176)
  })
})
