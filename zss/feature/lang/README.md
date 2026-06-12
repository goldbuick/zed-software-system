# Lang Module

ZSS scripting language compiler with a **TypeScript backend** (CI parity oracle) and **C++ WASM compiler** under `backend/wasm/`.

## Layout

| Path | Role |
|------|------|
| [`index.ts`](index.ts) | Public API — `compile`, `compileast`, `tokenize`, types |
| [`backend/typescript/`](backend/typescript/) | Chevrotain lexer → parser → AST → JS + source maps |
| [`backend/typescript/`](backend/typescript/) | Chevrotain lexer → parser → AST → JS + source maps (CI parity oracle) |
| [`backend/wasm/`](backend/wasm/) | C++ compiler → `zss_compile`, parity fixtures, tests |
| [`docs/`](docs/) | Compiler pipeline documentation |

Legacy path `zss/lang/` was removed; import from `zss/feature/lang`.

## Quick Start

Dev uses WASM lang by default (`ZSS_WASM_SCRIPT`); production builds default to the TS oracle until WASM lang is ready for ship. Use `yarn task run app:tslang:dev` to force TS in dev, or `ZSS_WASM_SCRIPT=true yarn task run app:build` to test WASM in a prod build:

```typescript
import { compile } from 'zss/feature/lang'

const result = compile('mychip', '#if 1\n#die\n')
if (result.code) {
  result.code(chipapi)
}
```

## Parity (C++ compiler)

ZSS validation corpus (TS oracle vs C++ WASM):

| Tier | Path | Count | Role |
|------|------|-------|------|
| **parity** | [`backend/wasm/__fixtures__/parity/`](backend/wasm/__fixtures__/parity/) | 19 | Micro-fixtures + TS golden `.js` / `.labels.json` |
| **integration** | [`backend/wasm/__tests__/fixtures/`](backend/wasm/__tests__/fixtures/) | 9 | Real board scripts (Simple Chat player, elseif chains, …) |
| **book** | [`backend/wasm/__tests__/fixtures/coolregionsbow/`](backend/wasm/__tests__/fixtures/coolregionsbow/) | 51 | Full element scripts from coolregionsbow |

Manifests: `__fixtures__/parity/manifest.json`, `__fixtures__/integration/manifest.json`, `coolregionsbow/manifest.json`.  
Loader: [`backend/wasm/corpus.ts`](backend/wasm/corpus.ts).

After editing `backend/wasm/` (C++ sources):

```bash
yarn task run lang:regression:test
```

Quick checks:

```bash
yarn task run lang:parity:test      # native C++ compile + behavioral vs TS oracle
yarn task run lang:corpus:test      # browser zss_lang.wasm against full corpus
yarn task run lang:wasm:test        # smoke (empty fixture only)
```

Regenerate golden fixtures from the TS oracle:

```bash
yarn task run lang:parity:fixtures:regen
```

Build WASM artifact:

```bash
yarn task run lang:build
```

Output: `cafe/public/wasm/lang/zss_lang.{js,wasm}`

Compile a `.zss` file to JS (stdout, C++ backend):

```bash
yarn task run lang:compile path/to/script.zss
cat script.zss | yarn task run lang:compile -
```

## Phase status

| Phase | Status |
|-------|--------|
| TS move to `feature/lang` | Done |
| C++ parity vs golden fixtures | In progress |
| Production switch (`ZSS_CPP_LANG`) | v1.5 (not started) |
| Bytecode VM | v2 (not started) |
