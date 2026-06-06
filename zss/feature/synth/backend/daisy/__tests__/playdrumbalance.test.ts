import {
  PLAY_DRUM_BALANCE_MAX_DB,
  PLAY_DRUM_BALANCE_MIN_DB,
  PLAY_DRUM_TARGET_DRUM_MINUS_PLAY_DB,
  evalplaydrumbalancegate,
} from 'zss/feature/synth/backend/daisy/playdrumbalance'

describe('playdrumbalance', () => {
  it('passes when drums are ~3 dB hotter than play', () => {
    const gate = evalplaydrumbalancegate({
      playpeakdb: -6,
      drumpeakdb: -3,
      drumminusplaydb: 3,
    })
    expect(gate.pass).toBe(true)
  })

  it('fails when play is hotter than drums', () => {
    const gate = evalplaydrumbalancegate({
      playpeakdb: -2,
      drumpeakdb: -6,
      drumminusplaydb: -4,
    })
    expect(gate.pass).toBe(false)
  })

  it('fails when drum lead is below min band', () => {
    const gate = evalplaydrumbalancegate({
      playpeakdb: -4,
      drumpeakdb: -3,
      drumminusplaydb: 1,
    })
    expect(gate.pass).toBe(false)
    expect(gate.reasons[0]).toContain(String(PLAY_DRUM_BALANCE_MIN_DB))
  })

  it('uses target 3 dB band 2–4', () => {
    expect(PLAY_DRUM_TARGET_DRUM_MINUS_PLAY_DB).toBe(3)
    expect(PLAY_DRUM_BALANCE_MIN_DB).toBe(2)
    expect(PLAY_DRUM_BALANCE_MAX_DB).toBe(4)
  })
})
