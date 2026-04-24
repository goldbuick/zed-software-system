import { DEFAULT_BPM } from 'zss/mapping/tick'

/** Tone default; transport time signature is not changed for synth. */
const TIME_SIGNATURE = 4

function beatseconds(bpm: number) {
  return 60 / bpm
}

/**
 * Seconds for a Tone-style notation label at fixed BPM and measure length.
 * Mirrors `tone` TimeBase note / measure / triplet rules (4/4-style `n` values).
 */
function notationtoseconds(
  notation: string,
  bpm: number,
  timeSignature: number,
): number {
  if (notation === '0') {
    return 0
  }
  const perbeat = beatseconds(bpm)
  const m = /^(\d+)m$/i.exec(notation)
  if (m) {
    return Number(m[1]) * timeSignature * perbeat
  }
  const nt = /^(\d+)n(\.?)$/i.exec(notation)
  if (nt) {
    const denom = Number(nt[1])
    const dotted = nt[2] === '.' ? 1.5 : 1
    const beats = denom === 1 ? timeSignature * dotted : (4 / denom) * dotted
    return beats * perbeat
  }
  const tr = /^(\d+)t$/i.exec(notation)
  if (tr) {
    const denom = Number(tr[1])
    return (8 / (denom * 3)) * perbeat
  }
  return 0
}

function buildcandidatenotations(): string[] {
  const out: string[] = ['1m']
  for (let power = 1; power < 9; power++) {
    const subdiv = 2 ** power
    out.push(`${subdiv}n.`, `${subdiv}n`, `${subdiv}t`)
  }
  out.push('0')
  return out
}

const CANDIDATE_NOTATIONS = buildcandidatenotations()

/** Duration in seconds from 64th-note units at {@link DEFAULT_BPM}. */
export function durationseconds(duration: number) {
  return (duration * 60) / (16 * DEFAULT_BPM)
}

/**
 * Closest Tone-style notation for a length in 64th-note units (same candidate
 * set as Tone `Time#toNotation()`), at {@link DEFAULT_BPM}.
 */
export function durationnotation(duration: number) {
  const target = durationseconds(duration)
  let closest = ''
  let closestSeconds = 0
  let first = true
  for (const notation of CANDIDATE_NOTATIONS) {
    const sec = notationtoseconds(notation, DEFAULT_BPM, TIME_SIGNATURE)
    if (first || Math.abs(sec - target) < Math.abs(closestSeconds - target)) {
      first = false
      closest = notation
      closestSeconds = sec
    }
  }
  return closest
}
