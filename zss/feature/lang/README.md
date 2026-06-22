# Lang Module

ZSS scripting language compiler — **TypeScript backend** (Chevrotain lexer → parser → AST → JS).

## Layout

| Path | Role |
|------|------|
| [`backend/typescript/`](backend/typescript/) | Lexer, parser, visitor, generator, source maps |
| [`langcompileclient.ts`](langcompileclient.ts) | Runtime `compilescript()` wrapper used by chip boot |
| [`zztlineclass.ts`](zztlineclass.ts) | ZZT line classification helpers (zztoop tooling) |
| [`docs/`](docs/) | Compiler pipeline documentation |
| [`zss/feature/zztoop/`](../zztoop/) | Separate ZZT-OOP parser pipeline |

Legacy path `zss/lang/` was removed; import from `zss/feature/lang/backend/typescript/generator` or `zss/feature/lang/langcompileclient`.

## Quick Start

```typescript
import { compile } from 'zss/feature/lang/backend/typescript/generator'

const result = compile('mychip', '#if 1\n#die\n')
if (result.code) {
  result.code(chipapi)
}
```

## Tests

```bash
yarn task run lang:regression:test
yarn jest --config ops/jest.config.ts ops/tests/unit/feature/lang/backend/typescript/__tests__/ --no-coverage
```

ZZT-OOP corpus and smoke tests live under `ops/tests/unit/feature/zztoop/`.

## Fixtures

| Tier | Path | Role |
|------|------|------|
| **integration** | [`ops/fixtures/lang/scripts/`](../../../ops/fixtures/lang/scripts/) | Real board scripts (Simple Chat player, elseif chains, …) |
| **book** | [`ops/fixtures/lang/coolregionsbow/`](../../../ops/fixtures/lang/coolregionsbow/) | Full element scripts from coolregionsbow |

Per-script lang WASM was removed from the runtime path; chip scripts always compile via TS `compile()` → `new Function('api', code)`.
