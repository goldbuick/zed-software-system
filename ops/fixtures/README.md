# Test fixtures

All test fixture **assets** live under this directory. Resolve paths via
[`zss/testsupport/fixturepaths.ts`](../../zss/testsupport/fixturepaths.ts) — do not
add co-located `__fixtures__` trees beside implementation code.

## Layout

| Path | Contents |
|------|----------|
| `lang/parity/` | Lang WASM parity `.zss` sources + `.js`/`.json` goldens + `manifest.json` |
| `lang/integration/` | Integration oracle outputs (e.g. `simple_chat_player.*`) + `manifest.json` |
| `lang/scripts/` | Integration-tier `.zss` sources (edge-case scripts) |
| `lang/coolregionsbow/` | 53-chip book corpus + `manifest.json` |
| `memory/wasm/` | Memory WASM step fixtures (`*.json`) |
| `synth/wasm/` | Synth parity metrics JSON |
| `synth/daisy/` | Daisy voice fixtures JSON |
| `synth/archive/maxi/` | Legacy Maxi parity JSON |
| `parse/` | Parse test assets (e.g. `twomeasures.mid`) |
| `books/` | Shipped book JSON (npm `"files"`) |
| `content/templates/` | Importable book templates (`manifest.json` + `pages/*.json`) |
| `content/dist/` | Built `.book.json` output (gitignored) |
| `wanix/` | WASI `.wat`/`.c` sources; built `.wasm` gitignored |
| `harness/` | Daisy/synth Playwright harness `.html` (not shipped in prod) |
| `e2e/` | Generated e2e repro JSON |
| `generated/training/` | Generated SFT corpus (`train.jsonl`, `eval.jsonl`, `manifest.json`) |

## Regen tasks

| Domain | Task / script |
|--------|----------------|
| Lang parity goldens | `yarn task run lang:parity:regen` (or regenfixtures test) |
| Memory parity | `yarn task run memory:parity:test` |
| Wanix wasm | `yarn task run wanix:wasm:build` |
| Training corpus | buildcorpus test / heavy training pipeline |
| Content books | `yarn task run content:book:build` / `content:book:validate` |
| Host memory repro | `yarn task run memory:repro:build` |

## Harness code (not here)

Embedded loaders and test helpers stay in `zss/testsupport/` (e.g. wanix hex
bytes). They reference sources under `ops/fixtures/wanix/`, not duplicate assets.

See [`.cursor/rules/fixtures.mdc`](../../.cursor/rules/fixtures.mdc) for agent guidance.
