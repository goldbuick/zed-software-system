# zed software system

A ZZT-inspired, web-based fantasy terminal — a creative-coding and game environment. Deep stack overview: [zss/ARCHITECTURE.md](zss/ARCHITECTURE.md).

## Development

From the repo root (requires [Yarn](https://yarnpkg.com/) and a current [Node.js](https://nodejs.org/) LTS):

All workflows run through the task CLI. Full index: [ops/docs/tasks.md](ops/docs/tasks.md).

| Command | What it does |
|--------|----------------|
| `yarn task run app:dev` | Install deps, then start the Vite dev server at **https://localhost:7777** (binds `0.0.0.0`) with **WASM lang** (default). |
| `yarn task run app:tslang:dev` | Same as `app:dev` but uses the **TS compiler** (`ZSS_WASM_SCRIPT=false`) for chip scripts. |
| `yarn task run app:wasm:dev` | Rebuild lang WASM (`lang:build`), then `app:dev`. |
| `yarn task run app:test` | Run the Jest suite (120s per-test timeout). |
| `yarn task run app:lint` | Dependency-cruiser, ESLint, and `tsc --noEmit`. |
| `yarn task run native:lint` | clang-format check on first-party C++ (requires LLVM clang-format 18+). |
| `yarn task run docs:check-links` | Check relative links in tracked `*.md` files. |
| `yarn task list` | List all tasks by group. |

Shorthand: `yarn task app dev` is equivalent to `yarn task run app:dev`.

Set `ZSS_DEBUG_PERF_UI=true` in `cafe/.env` (or export it) to enable the in-game perf overlay; see [`zss/perf/README.md`](zss/perf/README.md).

Production build: `yarn task run app:build`. **Dev** defaults to WASM lang; **production** defaults to the TS compiler until WASM lang issues are resolved. Override with `ZSS_WASM_SCRIPT=true yarn task run app:build` or `ZSS_WASM_SCRIPT=false` for dev. Per-area docs live under `zss/**/docs/` and `ops/docs/`.
