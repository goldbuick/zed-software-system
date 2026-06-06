# DaisySP-LGPL (vendored subset)

ZSS uses selected modules from [DaisySP-LGPL](https://github.com/electro-smith/DaisySP-LGPL) under **LGPL-2.1**.

## Modules linked into `zss_daisy.wasm`

| Module | Files | Used for |
|--------|-------|----------|
| `ReverbSc` | `Source/Effects/reverbsc.h`, `reverbsc.cpp` | Daisy backend `#reverb` FX |
| `Compressor` | `Source/Dynamics/compressor.h`, `compressor.cpp` | Daisy backend main bus compressor |

Full license text: [`LICENSE`](LICENSE).

## Relinking / modification

To rebuild the Daisy WASM synth with a modified LGPL module:

1. Edit files under `Source/Effects/` or `Source/Dynamics/` (or replace them).
2. From repo root: `yarn daisy:build` (requires Emscripten on PATH).
3. Output: `cafe/public/wasm/daisy/zss_daisy.js` and `zss_daisy.wasm`.

Upstream also provides [`gather_lgpl.sh`](https://github.com/electro-smith/DaisySP-LGPL/tree/main/distribution/gather_lgpl.sh) for standalone LGPL distribution bundles.
