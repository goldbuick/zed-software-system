---
name: daisy-synth-config
description: >-
  Audit and fix Daisy #synth config↔DSP wiring (wave enums, shared keys, fat
  unison, env). Use when changing wasmvoiceconfig, wasmosc/algo config, or
  native zss_osc / zss_voice / zss_engine, or when a #synth param seems ignored
  or a fat/am/fm wave sounds wrong.
---

# Daisy synth config

**Rule:** `.cursor/rules/daisy-synth-config.mdc` — read that first.  
**Memory:** `.cursor/memory/daisy-synth-lessons.md`

## Audit checklist (config “does nothing” or wrong timbre)

1. Does JS apply write SAB? (`wasmvoiceconfig.ts`, `wasmoscconfig.ts`, `wasmalgoconfig.ts`)
2. Does native `readosccfg` / `readalgocfg` / voicecfg pick up the slot?
3. Does the **sample path** use that field (not a sibling like `modfreq` instead of `harmonicity`)?
4. Is a **type-gate** returning false before the real owner? (piano `spread` vs fat `spread`)
5. For am/fm/fat carriers: is `familywavetobasic(osctype - N)` applied before `oscbasicwave`?
6. For fat: phase-accumulator unison, not N× `Process()` on one `Oscillator`
7. For algo `oscN`: value ≤ `PWM` (basic/pulse/pwm)? am/fm/fat must be rejected at parse
8. After native edits: `CLANG_FORMAT=… yarn task run ops:native:lint:fix` then `yarn task run ops:daisy:build`

## Wave enum trap

| Surface | Order |
|---------|--------|
| Basic / `modtype` / algo osc | square=0, sine=1, triangle=2, sawtooth=3 |
| am* / fm* / fat* family index | sine=0, square=1, triangle=2, sawtooth=3 at base 10/20/30 |

```cpp
// ❌ BAD — fatsquare (31) → 1 → sine
int cartype = osctype - 30;

// ✅ GOOD
int cartype = familywavetobasic(osctype - 30);
```

Wrong mapping can **hide** a worse DSP bug (e.g. fat multi-`Process` sounded “ok” as accidental sine).

## Shared keys

| Key | Owners | Apply rule |
|-----|--------|------------|
| `spread` | piano (0–1), fat (cents) | Piano only when `PIANO_VOICE`; else fall through to osc |
| `drawbar` | organ param vs named voice | Numeric → param; bare name → type switch |
| `brightness` / `damping` / … | multiple SOS families | First matching family type-gate; wrong type must not block unrelated owners forever |

## Fat unison

```text
❌ BAD — for each unison voice: oscbasicwave(sameOsc, …)  // phase × count / sample
✅ GOOD — voicephasestep += hz/sr; sample oscwavefromphase(type, step * mul + phase)
```

Cap `count` (e.g. 8). Reset `voicephasestep` on SYNTH note-on (existing engine path).

## Env wiring

If you multiply bells/drip/pluck (etc.) by `voiceenv`, type-switch defaults must match the documented product envelope or the voice will clip/shorten.

## Native lint (macOS)

`clang-format` is often under Homebrew LLVM, not on `PATH`:

```bash
CLANG_FORMAT=/opt/homebrew/opt/llvm/bin/clang-format yarn task run ops:native:lint:fix
CLANG_FORMAT=/opt/homebrew/opt/llvm/bin/clang-format yarn task run ops:native:lint
```

Or set `CLANG_FORMAT` in the environment permanently.

## Docs / Blume

Edit `zss/feature/synth/docs/*` — `docs-site/content/synth/*` is the same inode (hardlink). No separate copy step.
