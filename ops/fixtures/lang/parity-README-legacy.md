# ZSS lang compiler corpus

Validate the C++ parser/compiler against the TypeScript oracle using tiered `.zss` fixtures.

## Tiers

| Tier | Directory | Manifest | Tests |
|------|-----------|----------|-------|
| **parity** | `__fixtures__/parity/` | `manifest.json` | Lexer/parser/codegen edge cases; golden TS output (`.js`, `.labels.json`, `.diag.json`) |
| **integration** | `__tests__/fixtures/` | `__fixtures__/integration/manifest.json` | Real scripts from shipped boards |
| **book** | `__tests__/fixtures/coolregionsbow/` | `manifest.json` | All element scripts from the coolregionsbow book |

## Commands

```bash
yarn lang-parity:test       # Jest: native g++ CLI + behavioral parity (parity + selected integration/book)
yarn lang-corpus:test       # Node: cafe/public/wasm/lang against full corpus (79 scripts)
yarn lang-regression:test   # TS compiler + parity + behavioral + lang:build + corpus
```

Regenerate parity golden files from the TS oracle:

```bash
yarn lang-parity-fixtures:regen
```

## Adding fixtures

1. **parity** — add `.zss` source to `regenfixtures.test.ts`, run `lang-parity-fixtures:regen`, commit generated files.
2. **integration** — drop `my_script.zss` in `__tests__/fixtures/`, add id to `__fixtures__/integration/manifest.json`.
3. **book** — add to `coolregionsbow/manifest.json` and commit the `.zss` file.

Use `readcorpus(tier, id)` from [`corpus.ts`](../../../zss/feature/lang/backend/wasm/corpus.ts) in tests.
