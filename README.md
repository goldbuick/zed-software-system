# zed software system

A ZZT-inspired, web-based fantasy terminal — a creative-coding and game environment. Deep stack overview: [zss/ARCHITECTURE.md](zss/ARCHITECTURE.md).

## Documentation

| Surface | URL / path | Audience |
|---------|------------|----------|
| **System reference (this repo)** | [https://zed.cafe/docs/](https://zed.cafe/docs/) | Developers and creators — architecture, glossary, colocated `zss/**/docs` |
| **In-game / ZNS help** | [https://docs.at.zed.cafe](https://docs.at.zed.cafe) | Players and authors via ROM refscrolls |

Blume project root: [`docs-site/`](docs-site/). Module manuals stay colocated under `zss/**/docs/` (see [`.cursor/rules/docs-placement.mdc`](.cursor/rules/docs-placement.mdc)). Local preview: `yarn blume dev` from `docs-site/`. Production merge is part of `yarn task run cafe:build` → `cafe/dist/docs/`.

## Development

From the repo root (requires [Yarn](https://yarnpkg.com/) and a current [Node.js](https://nodejs.org/) LTS):

All workflows run through the task CLI. Full index: [ops/docs/tasks.md](ops/docs/tasks.md).

| Command | What it does |
|--------|----------------|
| `yarn task run cafe:dev` | Install deps, then start the Vite dev server at **https://localhost:7777** (binds `0.0.0.0`). |
| `yarn task run ops:test` | Run the Jest suite (120s per-test timeout). |
| `yarn task run ops:lint` | Dependency-cruiser, ESLint, and `tsc --noEmit`. |
| `yarn task run ops:native:lint` | clang-format check on first-party C++ (requires LLVM clang-format 18+). |
| `yarn task run ops:docs:check-links` | Check relative links in tracked `*.md` files. |
| `yarn task list` | List all tasks by group. |

Shorthand: `./task cafe dev` (or `yarn task cafe dev`) is equivalent to `yarn task run cafe:dev`.

Press **`Ctrl+I`** (or run `#perf` in the terminal) to toggle the in-game perf overlay; see [`zss/perf/README.md`](zss/perf/README.md).

Production build: `yarn task run cafe:build` (Vite app + Blume docs at `cafe/dist/docs/`). Chip scripts compile via the TypeScript lang backend. Per-area docs live under `zss/**/docs/` and selected `ops/docs/` pages (mounted into the docs site).
