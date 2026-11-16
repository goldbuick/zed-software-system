---
title: Notation
description: How to write #play lines — durations, notes, drums, and a few example bars.
---

`#play` and `#bgplay` take a short string of durations, notes, and drum hits.

## The digit trap

Digits `0`–`9` (and `p` / `k` / `r`) are **drum triggers**, not tempo or octave numbers.

| Wrong idea | What actually plays |
|------------|---------------------|
| `#play 50 c` as “C at 50” | Hi woodblock + hat + note C |
| Pitch literal `C4` in a play string | Digit `4` is hi snare — do not embed Tone-style pitches |

Prefer duration + note letters: `#play qc`, `hc`, `qceg`.

## Character map

| Character | Operation |
|-----------|------------|
| a-g, A-G | Notes A through G |
| x, X | Rest |
| # | Sharp |
| ! | Flat |
| + | Octave up |
| - | Octave down |
| y, Y | 64th note |
| t, T | 32nd note |
| s, S | 16th note |
| i, I | 8th note |
| q, Q | Quarter note |
| h, H | Half note |
| w, W | Whole note |
| 3 | Triplet |
| . | Dotted (1.5x) |
| 0 | Drum tick (hi-hat) |
| 1 | Drum tweet (open hi-hat) |
| 2 | Cowbell |
| p | Clap |
| 4 | Hi snare |
| 5 | Hi woodblock |
| 6 | Low snare |
| 7 | Low tom |
| 8 | Low woodblock |
| 9 | Bass drum |
| k | Crash cymbal |
| r | Ride cymbal |

## Write a bar

Duration sticks until you change it. Notes after a duration use that length.

```text
#synth square
#play qcde
```

Quarter notes C–D–E at the default octave.

```text
#play hc x qc
```

Half-note C, rest, quarter C.

```text
#play qceg;ixix
```

Voice 0: quarter C–E–G. Voice 1 (after `;`): eighth rests and notes. More voices: more `;` parts. Voices past the fourth `#play` slot bleed onto `#bgplay` (see below).

```text
#play q9 q4 qc
```

Bass drum, snare, then a pitched C — useful with [drums](/synth/drums).

## Multi-voice and bgplay

- Separate voices with `;`
- Fifth semicolon part lands on `#bgplay` channel 4 (keeps bgplay patch / volume / FX)
- A ninth voice is dropped

Full scale cheat sheets: [scales](/synth/scales). Voice and FX teaching: [voices](/synth/voices), [effects](/synth/effects).

## Duration math (quick)

Base unit is a 64th. Triplet divides by 3; dotted multiplies by 1.5.

| Token | Relative length |
|-------|-----------------|
| y | 1 |
| t | 2 |
| s | 4 |
| i | 8 |
| q | 16 |
| h | 32 |
| w | 64 |

Live `#play` / `#bgplay` add a tiny onset humanize (±4 ms / ±2 ms). Offline `#synthrecord` stays grid-locked. Portamento notes skip jitter so glides stay locked.
