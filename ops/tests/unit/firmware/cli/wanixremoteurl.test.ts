/**
 * @jest-environment node
 */
import { compilescript } from 'zss/feature/lang/langcompileclient'

function tokenimages(code: string): string[] {
  const result = compilescript('test', code) as {
    tokens?: { image: string }[]
  }
  const anyr = result as { tokens?: { image: string }[]; lexResult?: { tokens?: { image: string }[] } }
  const tokens = anyr.tokens ?? anyr.lexResult?.tokens ?? []
  return tokens.map((token) => token.image)
}

describe('wanix remote connect URL tokens', () => {
  it('splits bare wss url into scheme + colon-label', () => {
    const images = tokenimages(
      '#wanix remote connect wss://localhost:8765/ remote',
    )
    expect(images).toEqual(
      expect.arrayContaining(['wss', '://localhost:8765/', 'remote']),
    )
  })

  it('keeps quoted wss url as one stringliteral', () => {
    const images = tokenimages(
      '#wanix remote connect "wss://localhost:8765/" remote',
    )
    expect(images.some((image) => image.includes('wss://localhost:8765/'))).toBe(
      true,
    )
  })
})
