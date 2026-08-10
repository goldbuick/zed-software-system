import { replaylengthsec } from 'zss/feature/synth/replaylength'
import type { SYNTH_NOTE_ENTRY } from 'zss/feature/synth/playnotation'
import { tonenotationseconds } from 'zss/feature/synth/playnotation'

describe('replaylengthsec', () => {
  it('extends past the last tick by that tick notation duration plus pad', () => {
    const ticks: SYNTH_NOTE_ENTRY[] = [
      [0.1, [0, '4n', 'C4']],
      [0.5, [0, '2n', 'E4']],
    ]
    const span = 0.5
    const length = replaylengthsec(span, ticks)
    const expected =
      0.5 + tonenotationseconds('2n') + 0.15
    expect(length).toBeGreaterThanOrEqual(expected - 1e-9)
    // Naive span+5 would be 5.5; duration-aware length is shorter for short notes
    // but longer than span alone.
    expect(length).toBeGreaterThan(span)
  })

  it('covers bgplay-style ticks without end markers', () => {
    const ticks: SYNTH_NOTE_ENTRY[] = [[0.1, [4, '1n', 'C4']]]
    const length = replaylengthsec(0.1, ticks)
    expect(length).toBeGreaterThanOrEqual(
      0.1 + tonenotationseconds('1n') + 0.15 - 1e-9,
    )
  })
})
