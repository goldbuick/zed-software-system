import { readFileSync } from 'fs'
import { join } from 'path'

import { Midi } from '@tonejs/midi'
import {
  MAX_VOICES_PER_PLAY,
  drumline,
  durationticksToOp,
  midimeasurespans,
  midiplaysnippetsbymeasure,
  midiselecttracksfromfirstnotes,
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

  it('monophoneline skips overlapping notes (chord → one voice keeps first by sort order)', () => {
    const line = monophoneline(
      [
        { midi: 60, ticks: 0, durationTicks: 480, name: 'C4' },
        { midi: 64, ticks: 0, durationTicks: 480, name: 'E4' },
      ],
      480,
    )
    expect(line).toBe('+qc')
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

  it(`first ${MAX_VOICES_PER_PLAY} distinct tracks by global note order when ${MAX_VOICES_PER_PLAY + 1} tracks have notes at tick 0`, () => {
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

  it('drum among first four distinct tracks by global order is merged as one layer in sort order', () => {
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
    expect(midiselecttracksfromfirstnotes(midi)).toEqual([0, 1, 2, 3])
    expect(voices).toHaveLength(MAX_VOICES_PER_PLAY)
    expect(voices[0]).toBe('+qc')
    expect(voices[1]).toBe('+qc')
    expect(voices[2]).toBe('q9')
    expect(voices[3]).toBe('+qc')
  })

  it('ignores drum track if four other tracks appear first in global note order', () => {
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

  it('drum track before melodic in file order appears first in voices', () => {
    const midi = new Midi()
    const drumfirst = midi.addTrack()
    drumfirst.channel = 9
    drumfirst.addNote({ midi: 36, ticks: 0, durationTicks: 480, velocity: 0.8 })
    const mel = midi.addTrack()
    mel.channel = 0
    mel.addNote({ midi: 60, ticks: 0, durationTicks: 480, velocity: 0.8 })
    const { voices } = midivoicesfrommidi(midi)
    expect(midiselecttracksfromfirstnotes(midi)).toEqual([0, 1])
    expect(voices).toEqual(['q9', '+qc'])
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
    expect(midiselecttracksfromfirstnotes(midi)).toEqual([0, 1])
    const playlines = snippets.map((s) => `#play ${s}`)
    expect(playlines).toEqual(['#play +qcdef; wx', '#play +qgaa#+c; +qefga'])
  })

  it('many early notes on one track still allow a later track in U', () => {
    const midi = new Midi()
    const t = midi.addTrack()
    t.channel = 0
    for (let i = 0; i < 6; i++) {
      t.addNote({
        midi: 60 + i,
        ticks: i * 120,
        durationTicks: 120,
        velocity: 0.8,
      })
    }
    const b = midi.addTrack()
    b.channel = 1
    b.addNote({ midi: 72, ticks: 2000, durationTicks: 480, velocity: 0.8 })
    expect(midiselecttracksfromfirstnotes(midi)).toEqual([0, 1])
    const { voices } = midivoicesfrommidi(midi)
    expect(voices).toHaveLength(2)
  })

  it('single track with many notes yields one voice', () => {
    const midi = new Midi()
    const t = midi.addTrack()
    t.channel = 0
    for (let i = 0; i < 8; i++) {
      t.addNote({
        midi: 60 + i,
        ticks: i * 120,
        durationTicks: 120,
        velocity: 0.8,
      })
    }
    expect(midiselecttracksfromfirstnotes(midi)).toEqual([0])
    expect(midivoicesfrommidi(midi).voices).toHaveLength(1)
  })

  it('midiselecttracksfromfirstnotes uses ticks then track then midi', () => {
    const midi = new Midi()
    const late = midi.addTrack()
    late.channel = 0
    late.addNote({ midi: 60, ticks: 100, durationTicks: 480, velocity: 0.8 })
    const early = midi.addTrack()
    early.channel = 1
    early.addNote({ midi: 72, ticks: 0, durationTicks: 480, velocity: 0.8 })
    expect(midiselecttracksfromfirstnotes(midi)).toEqual([1, 0])
  })

  it('midimeasurespans follows each time signature at measure boundaries', () => {
    const midi = new Midi()
    midi.header.timeSignatures.push({ ticks: 0, timeSignature: [3, 4] })
    midi.header.timeSignatures.push({ ticks: 1440, timeSignature: [4, 4] })
    midi.header.update()
    expect(midimeasurespans(midi, 2000)).toEqual([
      { start: 0, end: 1440 },
      { start: 1440, end: 3360 },
    ])
  })

  it('aligns #play bars when meter changes mid-piece', () => {
    const midi = new Midi()
    midi.header.timeSignatures.push({ ticks: 0, timeSignature: [3, 4] })
    midi.header.timeSignatures.push({ ticks: 1440, timeSignature: [4, 4] })
    midi.header.update()
    const tr = midi.addTrack()
    tr.channel = 0
    tr.addNote({ midi: 60, ticks: 1440, durationTicks: 480, velocity: 0.8 })
    const { snippets } = midiplaysnippetsbymeasure(midi)
    expect(snippets).toHaveLength(2)
    expect(snippets[0]).toContain('x')
    expect(snippets[1]).toMatch(/^\+qc/)
    expect(snippets[1]).toMatch(/x$/)
  })
})
