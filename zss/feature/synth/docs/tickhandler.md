# tickhandler.ts

Handles scheduled note events. Called by the Tone.js Part (pacer) for each scheduled tick.

## createtickhandler(sourceFx, chain, recording, playback)

Returns `synthtick(time, value)` callback.

## value: SYNTH_NOTE_ON

`[chan, duration, note]`

- `chan`: Source/FX channel index (0-7)
- `duration`: Tone.js notation (e.g. "8n", "4n")
- `note`: `string` (pitch), `number` (drum id), or `null` (rest)

## String Notes (Pitch)

1. **BELLS:** Triggers sparkle at +2 octaves, random detune ±3 cents
2. **All:** `synth.triggerAttackRelease(note, duration, time)`
3. **Vibrato ramp:** depth 0→1 over 2n, 1→0 before release; frequency 1→5→1

## Numeric Notes (Drums)

| note | Drum | Trigger |
|------|------|---------|
| 0 | Tick | hi-hat closed |
| 1 | Tweet | hi-hat open |
| 2 | Cowbell | cowbell |
| 3 | Clap | clap |
| 4 | Hi snare | hi snare |
| 5 | Hi woodblock | hi woodblock |
| 6 | Low snare | low snare |
| 7 | Low tom | low tom |
| 8 | Low woodblock | low woodblock |
| 9 | Bass | kick |
| -1 | End | Decrements pacercount, clears pacer when 0 |

## Recording

- **Normal:** Pushes `[time, value]` to `recordedticks`
- **Replay (recordisrendering > 0):** Updates `recordlastpercent`, writes to register for progress display
