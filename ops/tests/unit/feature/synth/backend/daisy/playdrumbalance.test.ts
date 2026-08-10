import {
  PLAY_DRUM_BALANCE_MAX_DB,
  PLAY_DRUM_BALANCE_MIN_DB,
  PLAY_DRUM_TARGET_DRUM_MINUS_PLAY_DB,
  evalplaydrumbalancegate,
} from 'zss/feature/synth/backend/daisy/playdrumbalance'

describe('playdrumbalance', () => {
  it('passes when drums are near play peak', () => {
    const gate = evalplaydrumbalancegate({
      playpeakdb: -6,
      drumpeakdb: -6,
      drumminusplaydb: 0,
    })
    expect(gate.pass).toBe(true)
  })

  it('fails when play is much hotter than drums', () => {
    const gate = evalplaydrumbalancegate({
      playpeakdb: -2,
      drumpeakdb: -8,
      drumminusplaydb: -6,
    })
    expect(gate.pass).toBe(false)
  })

  it('fails when drum lead is above max band', () => {
    const gate = evalplaydrumbalancegate({
      playpeakdb: -4,
      drumpeakdb: 0,
      drumminusplaydb: 4,
    })
    expect(gate.pass).toBe(false)
    expect(gate.reasons[0]).toContain(String(PLAY_DRUM_BALANCE_MAX_DB))
  })

  it('uses target 0 dB band -2..+2', () => {
    expect(PLAY_DRUM_TARGET_DRUM_MINUS_PLAY_DB).toBe(0)
    expect(PLAY_DRUM_BALANCE_MIN_DB).toBe(-2)
    expect(PLAY_DRUM_BALANCE_MAX_DB).toBe(2)
  })
})
