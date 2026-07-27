# Daisy synth config lessons (agent memory)

From 2026 config/DSP audits (FM harmonicity, fat/am wave maps, shared keys, env). Rule: `daisy-synth-config.mdc`. Skill: `daisy-synth-config`.

## Before shipping synth config (confidence checklist)

1. Trace **sample path**, not only SAB write (`readosccfg` / `synthsource` / SOS voice).
2. Family am/fm/fat carriers: use `familywavetobasic` (TS: `wasmosctype.ts`, C++: `zss_osc.cpp`). Bare `osctype - 10/20/30` makes `fmsquare` sound like sine.
3. Shared `#synth` keys: on type mismatch **fall through** (never early `return false` before other owners).
4. FM ratio is **`harmonicity`**, never `modfreq` (PWM LFO only).
5. Fat unison: phase-accumulator (`oscwavefromphase`), not N× `Oscillator::Process()`.
6. After native C++: `ops:daisy:build` + hard-refresh (`DAISY_BUILD_ID`).
7. Run: `yarn jest ops/tests/unit/feature/synth/backend/wasm/wasmvoiceconfig.test.ts ops/tests/unit/feature/synth/backend/daisy/fmsquarecarrier.test.ts --config ops/jest.config.ts --no-coverage`
8. Ear / offline: `#synth fmsquare` vs `#synth fmsine` must differ; with `ZSS_PARITY_RENDER=1` the fmsquarecarrier offline lock asserts spectral delta.

Catalog: `zss/feature/synth/docs/voice-types-reference.md` confidence matrix.

## Config write ≠ DSP read

Params that write SAB but were ignored or wrong-field:

| Param | Bug class |
|-------|-----------|
| FM `harmonicity` | DSP used `modfreq` as ratio |
| PWM `modfreq` | Static width only |
| Fat `phase` / live `spread` | Ignored or apply-gated |
| Bells / drip `#synth env` | `voiceenv` written, not multiplied |
| Algo FM carriers | Hardcoded sine; algo4 missing `1→2`/`3→4` |

Fix at the sample owner; do not add a second “sync” path.

## Wave family enum swap

Basic: square=0, sine=1. Family am/fm/fat: sine, square at +0/+1. Bare `osctype - 30` made `fatsquare` → sine. Helper: `familywavetobasic` in `zss_osc.cpp` / `wasmosctype.ts`. Same trap for AM/FM carriers (`fmsquare` → sine is the recurring ear report).

## Wrong map hides worse bug

Fat called `Process()` once per unison voice on one oscillator → ~`count`× phase advance per sample. Accidental sine for `fatsquare` masked it; correct square made it “yikes”. Fix: phase-accumulator unison (`oscwavefromphase`), not multi-`Process`.

## Shared key gates

`ispianoparamkey('spread')` + `return false` for non-piano blocked fat `#synth spread`. Same class: `brightness`/`damping`/`pressure`/`vib`/`body` must fall through. Exclusive keys (`structure`, `accent`, `breath`, `hammer`, `bow`, …) may reject. Piano spread is 0–1; fat spread is cents (default 20).

## Algo oscN

`parsewasmosc` accepted `amsine`/`fat*`; `algopwave` only understands basic → silent square. `parsealgowaveconfig` must reject `osc > PWM`.

## Env defaults when wiring

Selecting `#synth bells` must install Tone-parity `0.01/3/0.3/6` once `voiceenv` multiplies the modal/sparkle mix.

## Tooling

- After native C++: `ops:daisy:build` + hard-refresh (`daisybuildid`)
- Native lint: `CLANG_FORMAT=/opt/homebrew/opt/llvm/bin/clang-format yarn task run ops:native:lint[:fix]` when `clang-format` not on PATH
- Synth Blume docs: hardlinked to `zss/feature/synth/docs/` — edit once

## Verification habit

Targeted: `yarn jest ops/tests/unit/feature/synth/backend/wasm/wasmvoiceconfig.test.ts ops/tests/unit/feature/synth/backend/daisy/fmsquarecarrier.test.ts --config ops/jest.config.ts --no-coverage`  
Ear: `#synth fatsquare` vs `#synth fatsine`; `#synth fmsquare` vs `#synth fmsine`; `#synth fmsquare` + `harmonicity`; `#synth algo0` + `osc4 sawtooth`

TS mirror of C++ map: `familywavetobasic` / `familyosctobasic` in `wasmosctype.ts` (must match `zss_osc.cpp`).
