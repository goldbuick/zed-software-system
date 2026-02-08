# algosynth.ts

FM-style algorithmic synthesizer with 4 operators and 8 modulation algorithms.

## Overview

`AlgoSynth` extends Tone.js `Monophonic` and implements a 4-operator FM architecture similar to classic synthesizers. Each operator has its own oscillator and envelope; operators can modulate each other or output directly based on the selected algorithm.

## Architecture

```
                    ┌─ harmonicity1 ─► operator1 ─┬─ modulation1 ─► operator2 frequency
                    │                              │
  frequency ────────┼─ harmonicity2 ─► operator2 ─┼─ modulation2 ─► operator3 frequency
                    │                              │
                    └─ harmonicity3 ─► operator3 ─┼─ modulation3 ─► operator4 frequency
                                                  │
                    (direct) ─────────────────────► operator4 ─► output
```

## Algorithm Reference

| Algo | Modulation Path | Output |
|------|-----------------|--------|
| 0 | 1→2→3→4 (serial) | op4 |
| 1 | 1,2→3→4 | op4 |
| 2 | 1→4, 2→3→4 | op4 |
| 3 | 1,2,3→4 | op4 |
| 4 | 1→2, 3→4 | op2 + op4 |
| 5 | 1→2, 1→3, 1→4 | op2 + op3 + op4 |
| 6 | 1→2 | op2 |
| 7 | (additive) | op1 + op2 + op3 + op4 |

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `algorithm` | 0-7 | Selects modulation routing |
| `harmonicity1` | Unit.Positive | Freq ratio for op1 (default 2) |
| `harmonicity2` | Unit.Positive | Freq ratio for op2 |
| `harmonicity3` | Unit.Positive | Freq ratio for op3 |
| `modulationindex1` | Unit.Positive | Modulation depth 1→2 |
| `modulationindex2` | Unit.Positive | Modulation depth 2→3 |
| `modulationindex3` | Unit.Positive | Modulation depth 3→4 |
| `oscillator1`-`4` | OmniOscillatorSynthOptions | Per-operator oscillator (default sine) |
| `envelope1`-`4` | EnvelopeOptions | Per-operator ADSR |

## Usage

```typescript
import { AlgoSynth } from './algosynth'

const synth = new AlgoSynth({
  algorithm: 3,
  harmonicity1: 2,
  harmonicity2: 4,
  modulationindex1: 10,
  oscillator4: { type: 'sine' },
})
synth.triggerAttackRelease('C4', '4n')
```

## Dependencies

- Tone.js: `Monophonic`, `Synth`, `Multiply`, `Gain`, `Signal`, `Envelope`, `OmniOscillator`
