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

Production code uses the TS backend automatically:

```typescript
import { compile } from 'zss/feature/lang'

const result = compile('mychip', '#if 1\n#die\n')
if (result.code) {
  result.code(chipapi)
}
```

## Parity (C++ compiler)

After editing `backend/wasm/` (C++ sources):

```bash
yarn lang-regression:test
```

Regenerate golden fixtures from the TS oracle:

```bash
yarn lang-parity-fixtures:regen
```

Build WASM artifact:

```bash
yarn lang:build
```

Output: `cafe/public/wasm/lang/zss_lang.{js,wasm}`

Compile a `.zss` file to JS (stdout, C++ backend):

```bash
yarn lang:compile path/to/script.zss
cat script.zss | yarn lang:compile -
```

## Phase status

| Phase | Status |
|-------|--------|
| TS move to `feature/lang` | Done |
| C++ parity vs golden fixtures | In progress |
| Production switch (`ZSS_CPP_LANG`) | v1.5 (not started) |
| Bytecode VM | v2 (not started) |
