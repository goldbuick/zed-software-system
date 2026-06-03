---
name: play-notation
description: Writes valid ZSS #play strings for parseplay/invokeplay — ROM/MIDI style (+hc, +qcde), not Tone C4 literals. Use for parity patches, level-stability scenarios, ROM copyit #play, and synth notation.
---

# Play notation (`#play`)

## When to use

- `PARITY_PATCH.notation`, `LEVEL_STABILITY_SCENARIO.notation`
- ROM `copyit #play …`, MIDI import output, `memory/synthstate` playback
- Any string passed to `parseplay()` then `invokeplay()`

**Source of truth:** [zss/feature/synth/playnotation.ts](../../../zss/feature/synth/playnotation.ts) (`CHAR_OP_MAP`, `parseplay`, `invokeplay`).

## Rules

1. **One character = one op** (left to right).
2. **`;` separates voices** (up to 4 segments per line).
3. **Default octave is 3** — bare `c` → scheduled **C3**.
4. **Octave only via `+` / `-`** — never digits for octave.
5. **Digits `0`–`9` and `p` are drums only** — e.g. `4` = hi snare, not “octave 4”.
6. **Pitch letters:** prefer lowercase `a`–`g`; `#` / `!` after the letter (`c#`, `b!`).
7. **Duration before each note:** `y/t/s/i/q/h/w` (64th→whole); `3` triplet; `.` dotted.
8. **ROM/MIDI order:** `+`/`-` then duration then pitch — e.g. `+hc` = half **C4**.

Scheduled pitch is built as `Note + accidental + octave` inside `invokeplay` (e.g. `c` after leading `+` → `C4`). Do not type `C4` in the play buffer unless calling `invokeplay` with a raw string (bypasses op stream).

## Character map

| Char | Meaning |
|------|---------|
| `a`–`g`, `A`–`G` | Pitch A–G |
| `x`, `X` | Rest |
| `#` | Sharp (after letter) |
| `!` | Flat |
| `+`, `-` | Octave up / down |
| `y`,`t`,`s`,`i`,`q`,`h`,`w` (+ upper) | 64th … whole |
| `3` | Triplet (÷3 current duration unit) |
| `.` | Dotted (×1.5) |
| `0` | Drum tick (hi-hat) |
| `1` | Open hi-hat |
| `2` | Cowbell |
| `p` | Clap |
| `4` | Hi snare |
| `5` | Hi woodblock |
| `6` | Low snare |
| `7` | Low tom |
| `8` | Low woodblock |
| `9` | Bass drum |
| `;` | Next voice (parse only) |

## Worked examples

| String | Meaning | Wrong |
|--------|---------|-------|
| `+hc` | Half note C4 | `hC4` (`4` = snare) |
| `+qcde` | Quarter C4 D4 E4 | `qC4qD4qE4` |
| `+icdeg` | 8th C4 D4 E4 G4 | `iC4iD4iE4iG4` |
| `+qcdef;wx` | Voice0 melody + voice1 rest/drums | |
| `x` | Rest | |

## Codegen

```typescript
import { invokeplay, parseplay } from 'zss/feature/synth/playnotation'

const ops = parseplay('+hc')[0]
const ticks = invokeplay(0, 0, ops, true)
```

For parity patches, put the **raw** play string in `notation`.

## Tone durations

`invokeplay` emits Tone-style strings (`8n`, `2n`, …) via `durationnotation()`. Offline render length uses `tonenotationseconds()` / `parityrenderlengthsec`.

## More examples

See [examples.md](examples.md) and [midi-import.md](../../../zss/feature/parse/docs/midi-import.md).
