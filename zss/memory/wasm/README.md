# zss_memory WASM parity (local dev)

Golden-fixture parity harness for the C++ `zss_memory` port. **Not run in CI** — use locally when changing memory WASM.

## Workflow

1. **Record fixtures** from TS oracle (after changing memory behavior or adding scenarios):

   ```bash
   yarn task run memory:parity:regen
   ```

2. **Validate native + WASM** (requires `g++`; WASM step needs Emscripten `emcc`):

   ```bash
   yarn task run memory:parity:test
   ```

   Native only:

   ```bash
   yarn task run memory:test:native
   ```

3. **Rebuild WASM artifacts** when C++ changes (also run automatically by `memory:parity:test`):

   ```bash
   yarn task run memory:build
   ```

   Outputs: `cafe/public/wasm/memory/zss_memory.{js,wasm}`

4. **Check fixture coverage** against `zss/memory/__tests__/`:

   ```bash
   yarn task run memory:parity:check-coverage
   ```

## Layout

| Path | Role |
|------|------|
| `zss_memory_core.hpp` | Session state, wire import/export, `run_op` dispatcher |
| `zss_memory_*.hpp` | Modular ports (permissions, lighting, synth, …) |
| `ops/fixtures/memory/wasm/*.json` | Frozen TS-oracle scenarios |
| `regenfixtures.test.ts` | Fixture recorder (`REGEN_MEMORY_FIXTURES=1`) |
| `__tests__/wasmparity.test.ts` | Native parity gate (local / `memory:parity:test`) |
| `yarn task run memory:parity:test` | Native + WASM replay runner |

## Adding a scenario

1. Add or extend a test in `zss/memory/__tests__/`.
2. Add a fixture writer in `regenfixtures.test.ts` and register it in `FIXTURE_MANIFEST`.
3. Implement or extend the matching `run_op` in C++.
4. Run `yarn task run memory:parity:regen` then `yarn task run memory:parity:test`.
