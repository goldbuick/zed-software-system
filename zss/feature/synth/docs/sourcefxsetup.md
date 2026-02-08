# sourcefxsetup.ts

Wires 8 sound sources and 4 FX channel groups into the audio chain.

## Layout

- **8 sources** — Indices 0-7, all start as SYNTH
- **4 FX groups** — Indices 0-3
- **Source→FX mapping:** `mapindextofx(index)`:
  - 0,1 → FX 0
  - 2,3 → FX 1
  - 4,5,6,7 → FX 2

## Routing Rules

| Source Type | Connection |
|-------------|------------|
| SYNTH, BELLS, DOOT, ALGO_SYNTH | synth → sendtofx |
| BELLS | Also: sparkle → sendtofx |
| RETRO/BUZZ/CLANG/METALLIC_NOISE | synth → filter1 → filter2 → sendtofx |

Noise sources use a filter chain (lowshelf + highshelf) before the FX send.

## changesource(index, type, algo)

Replaces the source at `index`:
1. Disposes current source
2. Creates new source via `createsource(type, algo)`
3. Reconnects via `connectsource(index)`

No-op if type and algo are unchanged.

## Play vs Background

- FX 0, 1 → `playvolume` (main playback)
- FX 2, 3 → `bgplayvolume` (background SFX)

Background sources (4-7) use FX 2; `SYNTH_SFX_RESET` (4) is where bgplay index wraps.
