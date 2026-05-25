# WASM synth — Phase 1 (core voices)

Phase 0 is complete. Phase 1 ports `#play` voice playback to the Maximilian WASM worklet.

## Enable

In `cafe/.env.local`:

```
ZSS_WASM_SYNTH=true
```

Do **not** set `ZSS_WASM_SPIKE=true` unless you are testing the 440 Hz spike — spike mode skips the voice synth.

Restart dev server, enable audio, then:

```text
#play qqC4qqD4qqE4qqF4
```

Four-voice square SYNTH (Tone `SOURCE_TYPE.SYNTH` approximation) plays through WASM.

## What works (Phase 1)

| Feature | Status |
|---------|--------|
| `#play` melodic notation (4 voices, `;` separated) | Yes |
| `#bgplay` one-shots | Yes |
| `#play` with empty buffer (stop) | Yes |
| `#playvolume` / `#bgplayvolume` | Partial (main gain wired) |
| TTS / STT | Yes (unchanged from Phase 0) |
| SYNTH (square) | Yes |
| LFSR noise (`retro`, `buzz`, `clang`, `metallic`) | Yes — BeepBox `noiseSynth` playback |
| Chip noise (`noise`, `hollow`) | Yes — WASM only |
| BELLS + sparkle layer | Yes |
| DOOT (membrane-style) | Yes |
| ALGO_SYNTH (`algo0`–`algo7`) | Yes (approximate FM routing) |
| `#synth` voice type config | Yes (type + oscillator: sine, square, fm*, am*, fat*, pwm, pulse) |
| `#synth env` / `#synth port` | Yes (ADSR seconds + portamento on SYNTH/ALGO) |
| Drums (digits 0–9) | Yes — see [wasm-phase2.md](wasm-phase2.md) |
| FX buses / `#echo` / `#reverb` | Yes — see Phase 3 FX in worklet |
| Per-voice oscillator tuning (phase, modindex, etc.) | No — future |

## Architecture

```text
#play string
  → parseplay / invokeplay (existing TS)
  → createwasmsynth scheduler (setTimeout + AudioContext.currentTime)
  → maxi.send('zss_voices', [freq, gate, type, algo, detune, osc])  SharedArrayBuffer
  → WASM play(): per-voice SOURCE_TYPE routing
```

## Files

| Path | Role |
|------|------|
| `zss/feature/synth/wasm/voiceplaycode.ts` | Maximilian `play()` DSP |
| `zss/feature/synth/wasm/noisewave.ts` | BeepBox 32768-sample noise tables |
| `zss/feature/synth/wasm/noisemeta.ts` | Per-type BeepBox expression / filter params |
| `zss/feature/synth/wasm/noiseplaycode.ts` | BeepBox `noiseSynth` playback loop |
| `zss/feature/synth/wasm/wasmvoiceconfig.ts` | `#synth` type → SAB mapping |
| `zss/feature/synth/wasm/wasmvoicecfgsab.ts` | `#synth env` / `port` → `zss_voicecfg` SAB |
| `zss/feature/synth/wasm/maxisynth.ts` | Scheduler + `createwasmsynth()` |
| `zss/device/synth.ts` | Routes `#play` + voice config to WASM when flag on |

## Voice type examples

```text
#synth 0 retro
#play wb

#synth 0 noise
#play wb

#synth 0 hollow
#play wb

#synth 1 bells
#play qqG4qqA4

#synth 2 algo3
#play qqE4qqF4

#synth 0 envelope 0.01 0.05 0.6 0.08
#synth 0 port 0.15
#play qqC4qqG4qqC5
```

### Listen-test (A/B vs BeepBox chip noise channel)

```text
#synth 0 retro     #play wb
#synth 0 noise     #play wb
#synth 0 clang     #play wb
#synth 0 buzz      #play wb
#synth 0 hollow    #play wb
#synth 0 metallic  #play wb
```

Compare against BeepBox chip noise presets with matching names.

## Next (Phase 3)

See [wasm-phase2.md](wasm-phase2.md) for drums and master chain. Phase 3 adds FX buses.
