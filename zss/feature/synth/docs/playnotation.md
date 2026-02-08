# playnotation.ts

Parses text-based notation and converts it to scheduled note events.

## Character Map

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

## Parse Format

- Multiple voices separated by `;`
- Example: `"qC4qD4qE4;qG4qA4"` — Two voices, first plays C-D-E, second plays G-A

## invokeplay()

```typescript
invokeplay(synthIndex, startTime, play, withendofpattern?)
```

- `play`: `SYNTH_OP[]` or raw note string (e.g. `"C4"`)
- `withendofpattern`: If true, appends `-1` marker to signal pattern end (default true)
- Returns: `SYNTH_NOTE_ENTRY[]` — `[time, [chan, duration, note]]` pairs

## Duration Logic

Base unit is `64n`. Duration values map to multiples:
- TIME_64: 1
- TIME_32: 2
- TIME_16: 4
- TIME_8: 8
- TIME_4: 16
- TIME_2: 32
- TIME_1: 64

Triplet divides current duration by 3; dotted multiplies by 1.5.

## Types

- `SYNTH_NOTE`: `null` (rest) | `string` (pitch) | `number` (drum id or -1)
- `SYNTH_NOTE_ON`: `[chan, duration, note]`
- `SYNTH_NOTE_ENTRY`: `[time, SYNTH_NOTE_ON]`
- `SYNTH_INVOKE`: `SYNTH_OP[] | string`
