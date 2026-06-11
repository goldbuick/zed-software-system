# zed software system

A ZZT-inspired, web-based fantasy terminal — a creative-coding and game environment. Deep stack overview: [zss/ARCHITECTURE.md](zss/ARCHITECTURE.md).

## Development

From the repo root (requires [Yarn](https://yarnpkg.com/) and a current [Node.js](https://nodejs.org/) LTS):

| Command | What it does |
|--------|----------------|
| `yarn app:dev` | Install deps, then start the Vite dev server at **https://localhost:7777** (binds `0.0.0.0`) with **WASM lang** (default). |
| `yarn app:tslang:dev` | Same as `app:dev` but uses the **TS compiler** (`ZSS_WASM_SCRIPT=false`) for chip scripts. |
| `yarn app:wasm:dev` | Rebuild lang WASM (`yarn lang:build`), then `app:dev`. |
| `yarn app:test` | Run the Jest suite (120s per-test timeout). |
| `yarn app:lint` | Dependency-cruiser, ESLint, and `tsc --noEmit`. |
| `yarn native:lint` | clang-format check on first-party C++ (requires LLVM clang-format 18+). |
| `yarn docs:check-links` | Check relative links in tracked `*.md` files. |

Set `ZSS_DEBUG_PERF_UI=true` in `cafe/.env` (or export it) to enable the in-game perf overlay; see [`zss/perf/README.md`](zss/perf/README.md).

Production build: `yarn app:build` (runs `vite build` after the Vosk model check). **Dev** defaults to WASM lang; **production** defaults to the TS compiler until WASM lang issues are resolved. Override with `ZSS_WASM_SCRIPT=true yarn app:build` or `ZSS_WASM_SCRIPT=false` for dev. Per-area docs live under `zss/**/docs/` and `docs/`.
