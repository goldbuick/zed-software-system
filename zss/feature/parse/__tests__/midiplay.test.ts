import { readFileSync } from 'fs'
import { join } from 'path'

import { Midi } from '@tonejs/midi'
import {
  drumline,
  durationticksToOp,
  midiplaysnippetsbymeasure,
  midivoicesfrommidi,
  monophoneline,
  pitchtonotation,
} from 'zss/feature/parse/midiplay'

describe('midiplay helpers', () => {
  it('durationticksToOp maps PPQ-relative lengths', () => {
    expect(durationticksToOp(480, 480)).toBe('q')
    expect(durationticksToOp(240, 480)).toBe('i')
    expect(durationticksToOp(960, 480)).toBe('h')
    expect(durationticksToOp(1920, 480)).toBe('w')
  })

  it('pitchtonotation lowercases and maps accidentals', () => {
    expect(pitchtonotation('C4')).toBe('c4')
    expect(pitchtonotation('F#5')).toBe('f#5')
    expect(pitchtonotation('Bb3')).toBe('b!3')
  })

  it('monophoneline inserts rests between notes', () => {
    const line = monophoneline(
      [
        { midi: 60, ticks: 0, durationTicks: 480, name: 'C4' },
        { midi: 64, ticks: 960, durationTicks: 480, name: 'E4' },
      ],
      480,
    )
    expect(line).toBe('c4qxqe4q')
  })

  it('drumline uses GM map and duration', () => {
    const line = drumline(
      [{ midi: 36, ticks: 0, durationTicks: 480, name: 'C2' }],
      480,
    )
    expect(line).toBe('9q')
  })
})

describe('midivoicesfrommidi', () => {
  it('single melodic note → one voice', () => {
    const midi = new Midi()
    const track = midi.addTrack()
    track.channel = 0
    track.addNote({ midi: 60, ticks: 0, durationTicks: 480, velocity: 0.8 })
    const { voices, truncatedbynotes } = midivoicesfrommidi(midi)
    expect(truncatedbynotes).toBe(false)
    expect(voices).toEqual(['c4q'])
  })

  it('round-trip through SMF bytes', () => {
    const midi = new Midi()
    const track = midi.addTrack()
    track.channel = 0
    track.addNote({ midi: 67, ticks: 0, durationTicks: 240, velocity: 0.8 })
    const bytes = midi.toArray()
    const parsed = new Midi(bytes)
    const { voices } = midivoicesfrommidi(parsed)
    expect(voices).toEqual(['g4i'])
  })

  it('channel 9 → drumline voice', () => {
    const midi = new Midi()
    const track = midi.addTrack()
    track.channel = 9
    track.addNote({ midi: 42, ticks: 0, durationTicks: 480, velocity: 0.8 })
    const { voices } = midivoicesfrommidi(midi)
    expect(voices).toEqual(['0q'])
  })

  it('two tracks → two voices (multi-voice `;` source strings)', () => {
    const midi = new Midi()
    const a = midi.addTrack()
    a.channel = 0
    a.addNote({ midi: 60, ticks: 0, durationTicks: 480, velocity: 0.8 })
    const b = midi.addTrack()
    b.channel = 1
    b.addNote({ midi: 72, ticks: 0, durationTicks: 480, velocity: 0.8 })
    const { voices } = midivoicesfrommidi(midi)
    expect(voices).toEqual(['c4q', 'c5q'])
  })

  it('truncatedbynotes when maxnoteevents exceeded', () => {
    const midi = new Midi()
    const track = midi.addTrack()
    track.channel = 0
    track.addNote({ midi: 60, ticks: 0, durationTicks: 480, velocity: 0.8 })
    track.addNote({ midi: 62, ticks: 480, durationTicks: 480, velocity: 0.8 })
    const { voices, truncatedbynotes } = midivoicesfrommidi(midi, {
      maxnoteevents: 1,
    })
    expect(truncatedbynotes).toBe(true)
    expect(voices).toEqual([])
  })
})

describe('midiplaysnippetsbymeasure (fixture .mid)', () => {
  it('emits one #play worth of parseplay text per measure (`;` = voices)', () => {
    const buf = readFileSync(join(__dirname, 'fixtures', 'twomeasures.mid'))
    const midi = new Midi(new Uint8Array(buf))
    const snippets = midiplaysnippetsbymeasure(midi)
    const playlines = snippets.map((s) => `#play ${s}`)
    // twomeasures.mid: 4/4 PPQ 480, two melodic tracks — track 2 is silent in bar 1
    // (four quarter rests collapse to `xw`). MIDI 70 is named A#4 by @tonejs/midi.
    expect(playlines).toEqual([
      '#play c4qd4qe4qf4q;xw',
      '#play g4qa4qa#4qc5q;e4qf4qg4qa4q',
    ])
  })
})
