import { readFileSync } from 'fs'
import { join } from 'path'

import { Midi } from '@tonejs/midi'
import {
  drumline,
  durationticksToOp,
  MAX_VOICES_PER_PLAY,
  midiplaysnippetsbymeasure,
  midivoicesfrommidi,
  monophoneline,
  playpitchfromscientificname,
  playreststringforticks,
} from 'zss/feature/parse/midiplay'

describe('midiplay helpers', () => {
  it('durationticksToOp maps PPQ-relative lengths', () => {
    expect(durationticksToOp(480, 480)).toBe('q')
    expect(durationticksToOp(240, 480)).toBe('i')
    expect(durationticksToOp(960, 480)).toBe('h')
    expect(durationticksToOp(1920, 480)).toBe('w')
  })

  it('playpitchfromscientificname uses start octave 3 and suffix accidentals', () => {
    expect(playpitchfromscientificname('C4')).toBe('+c')
    expect(playpitchfromscientificname('F#5')).toBe('++f#')
    expect(playpitchfromscientificname('Bb3')).toBe('b!')
  })

  it('monophoneline emits octave then duration then pitch; rest is x when duration still q', () => {
    const line = monophoneline(
      [
        { midi: 60, ticks: 0, durationTicks: 480, name: 'C4' },
        { midi: 64, ticks: 960, durationTicks: 480, name: 'E4' },
      ],
      480,
    )
    expect(line).toBe('+qcxe')
  })

  it('drumline uses duration-before-digit', () => {
    const line = drumline(
      [{ midi: 36, ticks: 0, durationTicks: 480, name: 'C2' }],
      480,
    )
    expect(line).toBe('q9')
  })

  it('drumline maps GM hand clap 39 to p', () => {
    const line = drumline(
      [{ midi: 39, ticks: 0, durationTicks: 480, name: 'D#2' }],
      480,
    )
    expect(line).toBe('qp')
  })

  it('drumline carries quarter duration across two hits', () => {
    const line = drumline(
      [
        { midi: 36, ticks: 0, durationTicks: 480, name: 'C2' },
        { midi: 42, ticks: 480, durationTicks: 480, name: 'F#2' },
      ],
      480,
    )
    expect(line).toBe('q90')
  })

  it('playreststringforticks uses duration-before-rest for 4/4 bar', () => {
    expect(playreststringforticks(1920, 480)).toBe('wx')
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
    expect(voices).toEqual(['+qc'])
  })

  it('round-trip through SMF bytes', () => {
    const midi = new Midi()
    const track = midi.addTrack()
    track.channel = 0
    track.addNote({ midi: 67, ticks: 0, durationTicks: 240, velocity: 0.8 })
    const bytes = midi.toArray()
    const parsed = new Midi(bytes)
    const { voices } = midivoicesfrommidi(parsed)
    expect(voices).toEqual(['+ig'])
  })

  it('channel 9 → drumline voice', () => {
    const midi = new Midi()
    const track = midi.addTrack()
    track.channel = 9
    track.addNote({ midi: 42, ticks: 0, durationTicks: 480, velocity: 0.8 })
    const { voices } = midivoicesfrommidi(midi)
    expect(voices).toEqual(['q0'])
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
    expect(voices).toEqual(['+qc', '++qc'])
  })

  it(`keeps at most ${MAX_VOICES_PER_PLAY} melodic voices when no drums`, () => {
    const midi = new Midi()
    for (let ch = 0; ch < 5; ch++) {
      const tr = midi.addTrack()
      tr.channel = ch
      tr.addNote({
        midi: 60 + ch,
        ticks: 0,
        durationTicks: 480,
        velocity: 0.8,
      })
    }
    const { voices } = midivoicesfrommidi(midi)
    expect(voices).toHaveLength(MAX_VOICES_PER_PLAY)
  })

  it('reserves one voice for merged drums when drum is among first four tracks', () => {
    const midi = new Midi()
    const a = midi.addTrack()
    a.channel = 0
    a.addNote({ midi: 60, ticks: 0, durationTicks: 480, velocity: 0.8 })
    const b = midi.addTrack()
    b.channel = 1
    b.addNote({ midi: 60, ticks: 0, durationTicks: 480, velocity: 0.8 })
    const d = midi.addTrack()
    d.channel = 9
    d.addNote({ midi: 36, ticks: 0, durationTicks: 480, velocity: 0.8 })
    const c = midi.addTrack()
    c.channel = 2
    c.addNote({ midi: 60, ticks: 0, durationTicks: 480, velocity: 0.8 })
    const tail = midi.addTrack()
    tail.channel = 3
    tail.addNote({ midi: 60, ticks: 0, durationTicks: 480, velocity: 0.8 })
    const { voices } = midivoicesfrommidi(midi)
    expect(voices).toHaveLength(MAX_VOICES_PER_PLAY)
    expect(voices[MAX_VOICES_PER_PLAY - 1]).toBe('q9')
  })

  it('ignores a drum track if it is after the fourth track-with-notes', () => {
    const midi = new Midi()
    for (let ch = 0; ch < 4; ch++) {
      const tr = midi.addTrack()
      tr.channel = ch
      tr.addNote({ midi: 60, ticks: 0, durationTicks: 480, velocity: 0.8 })
    }
    const d = midi.addTrack()
    d.channel = 9
    d.addNote({ midi: 36, ticks: 0, durationTicks: 480, velocity: 0.8 })
    const { voices } = midivoicesfrommidi(midi)
    expect(voices).toHaveLength(MAX_VOICES_PER_PLAY)
    expect(voices.join('')).not.toContain('9')
  })

  it('drums merged into one voice after all melodic tracks', () => {
    const midi = new Midi()
    const drumfirst = midi.addTrack()
    drumfirst.channel = 9
    drumfirst.addNote({ midi: 36, ticks: 0, durationTicks: 480, velocity: 0.8 })
    const mel = midi.addTrack()
    mel.channel = 0
    mel.addNote({ midi: 60, ticks: 0, durationTicks: 480, velocity: 0.8 })
    const { voices } = midivoicesfrommidi(midi)
    expect(voices).toEqual(['+qc', 'q9'])
  })

  it('multiple drum tracks merge into one line', () => {
    const midi = new Midi()
    const d0 = midi.addTrack()
    d0.channel = 9
    d0.addNote({ midi: 36, ticks: 0, durationTicks: 480, velocity: 0.8 })
    const d1 = midi.addTrack()
    d1.channel = 9
    d1.addNote({ midi: 42, ticks: 0, durationTicks: 480, velocity: 0.8 })
    const { voices } = midivoicesfrommidi(midi)
    expect(voices).toEqual(['q90'])
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
  it('drum-only: measure 0 prepends full-bar rest voice; later measures do not', () => {
    const midi = new Midi()
    const d = midi.addTrack()
    d.channel = 9
    d.addNote({ midi: 36, ticks: 0, durationTicks: 480, velocity: 0.8 })
    d.addNote({ midi: 36, ticks: 1920, durationTicks: 480, velocity: 0.8 })
    const { snippets } = midiplaysnippetsbymeasure(midi)
    expect(snippets[0]).toMatch(/^wx; /)
    expect(snippets[0]).toContain('q9')
    expect(snippets[1]).toMatch(/^q9/)
    expect(snippets[1]).not.toMatch(/^wx/)
  })

  it('emits one #play worth of parseplay text per measure (`;` = voices)', () => {
    const buf = readFileSync(join(__dirname, 'fixtures', 'twomeasures.mid'))
    const midi = new Midi(new Uint8Array(buf))
    const { snippets, truncatedbynotes } = midiplaysnippetsbymeasure(midi)
    expect(truncatedbynotes).toBe(false)
    const playlines = snippets.map((s) => `#play ${s}`)
    expect(playlines).toEqual(['#play +qcdef; wx', '#play +qgaa#+c; +qefga'])
  })
})
