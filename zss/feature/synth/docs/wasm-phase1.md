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
| `#playvolume` / `#bgplayvolume` / `#ttsvolume` | Yes — `zss_master` SAB (play, bg, tts) |
| TTS through worklet master chain | Yes — worklet audio input + `#ttsvolume` |
| STT | Yes (unchanged from Phase 0) |
| Drums (digits 0–9) | Yes — see [wasm-phase2.md](wasm-phase2.md) |
| FX buses / `#echo` / `#reverb` / `#autofilter` / `#autowah` | Yes — see Phase 3 FX in worklet |
| SYNTH (square) | Yes |
| LFSR noise (`retro`, `buzz`, `clang`, `metallic`) | Yes — BeepBox `noiseSynth` playback |
| Chip noise (`noise`, `hollow`) | Yes — WASM only |
| BELLS + sparkle layer | Yes |
| DOOT (membrane-style) | Yes |
| ALGO_SYNTH (`algo0`–`algo7`) | Yes (approximate FM routing) |
| `#synth` voice type config | Yes (type + oscillator: sine, square, fm*, am*, fat*, pwm, pulse) |
| `#synth env` / `#synth port` | Yes (ADSR seconds + portamento on SYNTH/ALGO) |
| `#synth` osc tuning (phase, width, fm/am, fat, partials, modtype, modenv) | Yes — `zss_osccfg` SAB |
| `#synth` algo ops (harmonicity, modindex, osc1–4, env1–4) | Yes — `zss_algocfg` SAB |
| TTS through worklet master chain | Yes — worklet audio input |
| Sidechain duck (bgplay + TTS → play bus) | Yes — Tone-style follower in `masterout` |
| Stacked FX buses | Yes — serial chain fc→echo→reverb→autofilter→distort→autowah |

### Autowah (Tone parity)

All `#autowah` params drive the WASM follower + sweeping bandpass/peaking chain (Q fixed at 2). `#autowah on` send matches Tone at **18**.

```text
#autowah on
#play qqC4qqG4qqC5

#autowah basefrequency 200
#autowah octaves 4
#autowah sensitivity -20
#autowah gain 6
#autowah follower 0.05
#play qqE4qqE4qqE4
```

### Autofilter (Tone parity)

LFO sine modulates biquad cutoff from `baseFrequency` to `baseFrequency × 2^octaves`. `#autofilter on` send matches Tone at **50**.

```text
#autofilter on
#play qqC4qqG4qqC5

#autofilter frequency 2
#autofilter depth 0.8
#autofilter octaves 4
#autofilter q 2
#autofilter type bandpass
#play qqE4qqE4qqE4
```

## Architecture

```text
#play / #bgplay / TTS
  → parseplay / invokeplay (existing TS)
  → createwasmsynth scheduler (setTimeout + AudioContext.currentTime)
  → SAB channels:
       zss_voices      — freq, gate, type, algo, detune, osc
       zss_voicecfg    — envelope, portamento
       zss_osccfg      — phase, width, fm/am, fat, partials
       zss_algocfg     — harmonicity, modindex, osc1–4, env1–4
       zss_master[3]   — play / bgplay / tts volume
       zss_fx          — FX sends and params
  → TTS: BufferSource → Gain → worklet input[0]
  → WASM play(inputsample):
       per-voice SOURCE_TYPE routing
       masterout(play, bg, drums, tts) — sidechain ducks play from bg + TTS
```

## Files

| Path | Role |
|------|------|
| `zss/feature/synth/wasm/voiceplaycode.ts` | Maximilian `play()` DSP |
| `zss/feature/synth/wasm/noisewave.ts` | BeepBox 32768-sample noise tables |
| `zss/feature/synth/wasm/noisemeta.ts` | Per-type BeepBox expression / filter params |
| `zss/feature/synth/wasm/noiseplaycode.ts` | BeepBox `noiseSynth` playback loop |
| `zss/feature/synth/wasm/wasmvoiceconfig.ts` | `#synth` type → SAB mapping |
| `zss/feature/synth/wasm/wasmmastersab.ts` | `zss_master` SAB (play, bg, tts volume) |
| `zss/feature/synth/wasm/wasmmasterplaycode.ts` | Master chain + sidechain duck |
| `zss/feature/synth/wasm/wasmsidechainplaycode.ts` | Tone-style sidechain follower |
| `zss/feature/synth/wasm/wasmoscconfigsab.ts` | `#synth` osc tuning → `zss_osccfg` SAB |
| `zss/feature/synth/wasm/wasmoscconfig.ts` | Osc config apply handlers |
| `zss/feature/synth/wasm/wasmoscplaycode.ts` | Osc param read helpers |
| `zss/feature/synth/wasm/wasmalgoconfigsab.ts` | `#synth` algo ops → `zss_algocfg` SAB |
| `zss/feature/synth/wasm/wasmalgoconfig.ts` | Algo config apply handlers |
| `zss/feature/synth/wasm/wasmalgoplaycode.ts` | Algo param read helpers |
| `zss/feature/synth/wasm/wasmvoicecfgsab.ts` | `#synth env` / `port` → `zss_voicecfg` SAB |
| `zss/feature/synth/wasm/wasmautowah.ts` | Tone AutoWah math helpers |
| `zss/feature/synth/wasm/wasmautowahplaycode.ts` | AutoWah follower + filter DSP |
| `zss/feature/synth/wasm/wasmautofilter.ts` | Tone AutoFilter math helpers |
| `zss/feature/synth/wasm/wasmautofilterplaycode.ts` | AutoFilter LFO + biquad DSP |
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

## Next

- **Phase 4 (deferred):** `#synthrecord` / MP3 export on WASM path

See [wasm-phase2.md](wasm-phase2.md) for drums and master chain details.
