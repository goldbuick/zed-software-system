# audio.ts

**Purpose**: Defines `AUDIO_FIRMWARE` — commands for audio synthesis, playback, text-to-speech (TTS), and effects. Wraps the synth device API for use from user codepages.

## Dependencies

- `zss/chip` — CHIP type for execution context
- `zss/device/api` — synth functions (synthplay, synthbpm, synthtts, etc.)
- `zss/device/session` — SOFTWARE session
- `zss/firmware` — createfirmware
- `zss/mapping/types` — type guards (isnumber, ispresent, isstring)
- `zss/words/*` — argument parsing, category/collision/color/dir mapping

## Command Categories

### Text-to-Speech

| Command | Args | Description |
|---------|------|-------------|
| `ttsengine` | `engine` [, `config`] | Set TTS engine and optional config |
| `tts` | [voice] [, phrase] | Speak phrase with voice; no args = clear queue; voice only = info |
| `ttsqueue` | `voice`, `phrase` | Queue TTS text |
| `ttsvol` | `volume` | Set TTS volume |

### Playback

| Command | Args | Description |
|---------|------|-------------|
| `play` | [buffer] | Play audio buffer (can reference chip variable) |
| `bgplay` | [buffer] | Play background audio |
| `bgplayon64n` … `bgplayon1n` | [buffer] | Same as `bgplay` but quantized to note length |
| `vol` | `volume` | Set foreground playback volume |
| `bgvol` | `volume` | Set background playback volume |
| `bpm` | `bpm` | Set BPM |

### Synthesis

| Command | Args | Description |
|---------|------|-------------|
| `synth` | [voice config…] | Configure all 4 play voices; no args = restart synth |
| `synth1` … `synth4` | [config…] | Configure individual play voices |
| `synth5` | [config…] | Configure background synth voices (4–8) |
| `synthrecord` | [filename] | Record synth output |
| `synthflush` | — | Flush synth buffer |

### Effects (multi-voice)

| Command | Description |
|---------|-------------|
| `echo` | Echo on voices 0–1 |
| `fcrush` | Bitcrush (fc) on voices 0–1 |
| `autofilter` | Autofilter on voices 0–1 |
| `reverb` | Reverb on voices 0–1 |
| `distort` | Distortion on voices 0–1 |
| `vibrato` | Vibrato on voices 0–1 |
| `autowah` | Autowah on voices 0–1 |

### Per-voice effects

| Command | Description |
|---------|-------------|
| `echo1`, `echo2`, `echo3` | Echo on specific voice |
| `fcrush1`, `fcrush2`, `fcrush3` | Bitcrush on specific voice |
| `autofilter1` … `autofilter3` | Autofilter on specific voice |
| `reverb1` … `reverb3` | Reverb on specific voice |
| `distort1` … `distort3` | Distortion on specific voice |
| `vibrato1` … `vibrato3` | Vibrato on specific voice |
| `autowah1` … `autowah3` | Autowah on specific voice |

## Internal Helpers

- **`handlesynthvoice`** — Parses voice config (volume, fx name, or partials) and calls `synthvoice`
- **`handlesynthvoicefx`** — Parses fx config/value and calls `synthvoicefx`
- **`handleplaystr`** — Resolves play buffer from chip vars; validates it’s not a mapped word (category, collision, color, dir)
- **`handlebgplay`** — Wraps `synthbgplay` with play string and optional quantize

## Context

Uses `READ_CONTEXT.elementfocus` and `READ_CONTEXT.board?.id` for player/board context. All synth calls go through the `SOFTWARE` session.
