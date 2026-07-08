# Test fixtures

All test fixture **assets** live under this directory. Resolve paths via
[`ops/lib/fixturepaths.ts`](../../ops/lib/fixturepaths.ts) — do not
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
| `synth/maxi/` | Legacy Maxi parity JSON |
| `parse/` | Parse test assets (e.g. `twomeasures.mid`) |
| `wanix/` | Wanix sources (`src/*.wat`, zedcafe Go); built binaries in [`ops/public/wanix/`](../public/wanix/) |
| `books/` | Shipped book JSON (npm `"files"`) |
| `content/templates/` | Importable book templates (`manifest.json` + `pages/*.json`) |
| `content/dist/` | Built `.book.json` output (gitignored) |
| `renders/` | Offline Daisy/synth render outputs (wav/json/txt); dev serves `/renders/` |
| `zzt/corpus/` | Museum manifest + committed `zss/`; gitignored `archives/`, `extracted/`, `screenshots/` |

## Regen tasks

| Domain | Task / script |
|--------|----------------|
| **All build + fixture regen** | `yarn task run ops:build` |
| Lang parity goldens | `yarn task run ops:fixtures:lang:regression:test` (Jest parity suite; regen via native g++ harness if goldens drift) |
| Memory parity | `yarn task run ops:fixtures:memory:parity:test` |
| ZZT OOP corpus | `yarn task run ops:fixtures:zzt:corpus:build` |
| ZZT board screenshots | `yarn task run ops:fixtures:zzt:corpus:screenshots` |
| Content books | `yarn task run ops:fixtures:content:book:build` / `ops:fixtures:content:book:validate` |
| Wanix drop fixtures | `yarn task run ops:fixtures:wanix:build` (needs WABT `wat2wasm`) |

## Parity / Playwright (not here)

Daisy parity runners live under `ops/lib/daisy-parity/*-runner.ts`. Playwright tasks use `/parity-host` (middleware blank COEP page) + `page.evaluate` — see [`no-harness-html.mdc`](../../.cursor/rules/no-harness-html.mdc).

Browser e2e must not add `window.__zss_e2e` instrumentation in `cafe/` or `zss/feature/`. Daisy parity tasks use headed Playwright via `tasks/lib/parity/parity-playwright.ts`.

See [`.cursor/rules/fixtures.mdc`](../../.cursor/rules/fixtures.mdc) for agent guidance.
