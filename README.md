# zed software system

A ZZT-inspired, web-based fantasy terminal — a creative-coding and game environment. Deep stack overview: [zss/ARCHITECTURE.md](zss/ARCHITECTURE.md).

## Development

From the repo root (requires [Yarn](https://yarnpkg.com/) and a current [Node.js](https://nodejs.org/) LTS):

| Command | What it does |
|--------|----------------|
| `yarn app:dev` | Install deps, clear local build outputs, ensure the bundled Vosk speech model, then start the Vite dev server at **https://localhost:7777** (binds `0.0.0.0`). |
| `yarn app:test` | Run the Jest suite. |
| `yarn app:lint` | Dependency-cruiser, ESLint, and `tsc --noEmit`. |
| `yarn native:lint` | clang-format check on first-party C++ (requires LLVM clang-format 18+). |
| `yarn docs:check-links` | Check relative links in tracked `*.md` files (uses `markdown-link-check`). |

Production build: `yarn app:build` (runs `vite build` after the Vosk model check). Per-area docs live under `zss/**/docs/` and `docs/`.
