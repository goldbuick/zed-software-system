# zed software system

A ZZT-inspired, web-based fantasy terminal — a creative-coding and game environment. Deep stack overview: [zss/ARCHITECTURE.md](zss/ARCHITECTURE.md).

## Development

From the repo root (requires [Yarn](https://yarnpkg.com/) and a current [Node.js](https://nodejs.org/) LTS):

| Command | What it does |
|--------|----------------|
| `yarn dev` | Install deps, clear local build outputs, ensure the bundled Vosk speech model, then start the Vite dev server at **http://localhost:7777** (binds `0.0.0.0`). |
| `yarn test` | Run the Jest suite. |
| `yarn lint` | Dependency-cruiser, ESLint, and `tsc --noEmit`. |
| `yarn docs:links` | Check relative links in tracked `*.md` files (uses `markdown-link-check`). |

Production build: `yarn build` (runs `vite build` after the Vosk model check). Per-area docs live under `zss/**/docs/` and `docs/`.
