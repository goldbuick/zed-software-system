import { hudphaselabel } from 'ops/media-queue/ui/statushud'

describe('hudphaselabel queue-probe', () => {
  it('shows media request for a single add url', () => {
    expect(hudphaselabel('queue-probe')).toBe('media request')
    expect(
      hudphaselabel('queue-probe', 'https://www.youtube.com/watch?v=abc'),
    ).toBe('media request')
  })

  it('shows N/M for playlist scan progress', () => {
    expect(hudphaselabel('queue-probe', '0/18')).toBe('media 0/18')
    expect(hudphaselabel('queue-probe', '3/18 Purgatory')).toBe('media 3/18')
  })
})
