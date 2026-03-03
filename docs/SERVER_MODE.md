# Server Mode: Current State & New Approach

This document describes the current server mode implementation and a proposed new approach using Vite bundling with an override pattern for server-specific implementations.

---

## Current State

### Overview

The ZSS server runs a headless simulation of the game engine with:

- **Ink** terminal UI (REPL with log output)
- **Child processes** for sim (game logic) and heavy (AI/TTS) workloads
- **PeerJS** for remote clients to connect via WebRTC
- **Storage-server** for config/persistence (replaces browser idb-keyval)

### Entry Points

| Entry | Purpose |
|-------|---------|
| `zss/server/main.tsx` | CLI server: Ink UI, vmcli, platform |
| `zss/server/simspace.fork.ts` | Sim worker: gadgetserver, modem, clock, forwards to parent |
| `zss/server/heavyspace.fork.ts` | Heavy worker: AI/TTS, forwards to parent |

### Current Build System

**Two separate pipelines:**

1. **Web (cafe)**: Vite builds `cafe/` → `cafe/dist/`
   - Single-page app with Three.js, React, etc.
   - Root: `cafe/`, Vite config: `vite.config.ts`
   - Resolves `zss/*` and `cafe/*` via aliases

2. **Server**: esbuild (scripts/build-server.mjs) → `dist-server/`
   - Bundles `server.cjs`, `simspace.cjs`, `heavyspace.cjs`
   - Platform: node, format: cjs, target: node20
   - Externals: onnxruntime-node, @huggingface/transformers, source-map, @roamhq/wrtc

### Dev vs Bundled Run Modes

| Mode | How | Server entry | Sim entry | Heavy entry |
|------|-----|---------------|-----------|-------------|
| **Dev** | `yarn server` (tsx) | `zss/server/main.tsx` | `simspace.fork.ts` | `heavyspace.fork.ts` |
| **Bundled** | `dist-server/server.cjs` | server.cjs | simspace.cjs | heavyspace.cjs |
| **Pkg** | `dist-bin/zss-server` | pkg exe | pkg exe | pkg exe |

In dev mode, `platform.ts` uses `tsx` + `--experimental-loader` (`zss/server/loader.mjs`) to run `.ts` forks. In bundled mode, it uses `.cjs` files in the same directory. In pkg mode, it uses `.exe` siblings (e.g. `zss-simspace` next to `zss-server`).

### Current Override Mechanisms

**1. Import alias (esbuild + tsconfig.server.json)**

```json
"zss/feature/storage": ["./zss/feature/storage-server.ts"]
```

- Web: `storage.ts` (idb-keyval, DOM)
- Server: `storage-server.ts` (Node fs, no DOM)

**2. Loader (dev mode only)**

`zss/server/loader.mjs` runs when using tsx. It:

- Redirects `zss/feature/storage` → `storage-server.ts`
- Redirects `maath/misc` → `zss/server/stubs/maath-misc.ts` (stub for 3D math)
- Resolves `zss/*` to `./zss/*` with proper extensions

**3. Hard-coded imports**

- `zss/server/main.tsx` → `zss/device/rackregister` (not `register`)
- `zss/feature/netterminal-server.ts` → `zss/device/rackregister`, `storage-server`
- `zss/device/rackregister.ts` → `netterminal-server`, `storage-server` directly

### Server-Specific vs Web Modules

| Area | Web | Server |
|------|-----|--------|
| Storage | `zss/feature/storage.ts` (idb-keyval) | `zss/feature/storage-server.ts` |
| Register | `zss/device/register.ts` (React, Zustand) | `zss/device/rackregister.ts` |
| Netterminal | `zss/feature/netterminal.ts` (idb, browser Peer) | `zss/feature/netterminal-server.ts` (storage-server, wrtc) |
| maath/misc | Real 3D math | `zss/server/stubs/maath-misc.ts` |

### Pain Points (Current Approach)

1. **Dual build pipelines**: Vite for web, esbuild for server — different behavior, config drift
2. **Loader only in dev**: tsx + loader for `.ts` forks; production uses pre-bundled `.cjs`, so behavior can diverge
3. **Scattered overrides**: Aliases, loader, direct imports — no single pattern
4. **Manual wiring**: rackregister, netterminal-server, etc. are imported explicitly, not via a central “mode”
5. **No shared optimizations**: Vite’s chunking, tree-shaking, and analysis don’t apply to server

---

## Proposed New Approach

### Goals

1. **Single bundler**: Use Vite for server as well as web
2. **Explicit override pattern**: Server mode replaces web modules via a consistent mechanism
3. **Unified config**: One place to define server overrides and build behavior
4. **Same output shape**: Continue producing `server.cjs`, `simspace.cjs`, `heavyspace.cjs` for pkg compatibility

### Override Pattern

**Principle**: Web mode is the default. Server mode overrides specific modules.

**Proposed structure**:

```
zss/
  feature/
    storage.ts          # web (default)
    storage-server.ts   # server override
    netterminal.ts      # web (default)
    netterminal-server.ts  # server override
  device/
    register.ts         # web (default)
    rackregister.ts     # server override
  server/
    main.tsx
    simspace.fork.ts
    heavyspace.fork.ts
```

**Override resolution** (at build time):

- When building **server** (or `mode === 'server'`), Vite’s `resolve.alias` maps:
  - `zss/feature/storage` → `zss/feature/storage-server.ts`
  - `zss/device/register` → `zss/device/rackregister.ts`
  - `zss/feature/netterminal` → `zss/feature/netterminal-server.ts`
  - `maath/misc` → `zss/server/stubs/maath-misc.ts`
- Web build stays unchanged; no overrides.

**Refactor target**: Remove direct imports of `rackregister` and `netterminal-server` from server code. Instead:
- Import `zss/device/register` (resolved to rackregister on server)
- Import `zss/feature/netterminal` (resolved to netterminal-server on server)
- Storage is already abstracted via `zss/feature/storage` alias.

### Vite Server Build

**Config shape** (conceptual):

```ts
// vite.server.config.ts or conditional block in vite.config.ts
export default defineConfig(({ mode }) => {
  const isServer = mode === 'server' || process.env.ZSS_SERVER === '1'

  return {
    root: isServer ? '.' : 'cafe',
    build: {
      outDir: isServer ? 'dist-server' : 'cafe/dist',
      lib: isServer ? {
        entry: {
          server: 'zss/server/main.tsx',
          simspace: 'zss/server/simspace.fork.ts',
          heavyspace: 'zss/server/heavyspace.fork.ts',
        },
        formats: ['cjs'],
      } : undefined,
      rollupOptions: { ... },
    },
    resolve: {
      alias: {
        ...(isServer ? {
          'zss/feature/storage': path.resolve(__dirname, 'zss/feature/storage-server.ts'),
          'zss/device/register': path.resolve(__dirname, 'zss/device/rackregister.ts'),
          'zss/feature/netterminal': path.resolve(__dirname, 'zss/feature/netterminal-server.ts'),
          'maath/misc': path.resolve(__dirname, 'zss/server/stubs/maath-misc.ts'),
        } : {}),
      },
    },
    define: {
      ...(isServer ? {
        'process.env.ZSS_HEADLESS': '"1"',
        'typeof window': '"undefined"',
      } : {}),
    },
    plugins: isServer ? [/* node-compat, no React DOM stuff */] : [/* web plugins */],
  }
})
```

**Scripts**:

- `yarn build` — web (unchanged)
- `yarn build:server` — server via Vite (replaces esbuild script)
- `yarn server` — can run `node dist-server/server.cjs` or keep `tsx` for dev with loader

### Dev Server Mode

Options:

1. **Vite dev server for server** (experimental): Run Vite in build-watch for server, execute output with node.
2. **Keep tsx for dev**: `tsx zss/server/main.tsx` with loader — simpler, matches current dev flow.
3. **Hybrid**: tsx for quick iteration; Vite build for “production-like” local runs.

### Compatibility Requirements

- **pkg**: Receives `server.js`, `simspace.js`, `heavyspace.js` in `dist-server/` (ESM output; package.json has `"type": "module"`).
- **platform**: Supports `.js`, `.cjs`, `.mjs` for bundled mode; `.fork.ts` for dev (tsx + loader); `.exe` for pkg.
- **peerjs-node-polyfill**: Must run before PeerJS; keep as a side-effect import in server entry.
- **Ink**: Server UI; bundled (Ink/yoga-layout use ESM+TLA, so Vite outputs ESM; CJS would fail).
- **Externals**: onnxruntime-node, @huggingface/transformers, source-map, @roamhq/wrtc — marked external for server build.

---

## Implementation Checklist (Completed 2025-03)

1. [x] Add `vite.server.config.ts` with server mode
2. [x] Define server aliases for storage, register, netterminal, maath/misc
3. [x] Update `scripts/build-server.mjs` to invoke Vite
4. [x] Refactor `main.tsx`, `rackregister`, `netterminal-server` to use abstract imports
5. [x] Keep `loader.mjs` for tsx dev (register, netterminal, storage, maath overrides)
6. [ ] Verify pkg builds (`pkg:host`, `pkg:all`) — may need ESM compatibility check
7. [ ] Add `yarn dev:server` if desired (Vite watch for server)
8. [ ] Document environment variables and mode switching

---

## File Reference

| File | Role |
|------|------|
| `vite.config.ts` | Web build (cafe) |
| `scripts/build-server.mjs` | Server builder (Vite via vite.server.config.ts) |
| `zss/server/loader.mjs` | Node loader for tsx dev |
| `tsconfig.server.json` | Server TypeScript config |
| `zss/server/platform.ts` | Spawns sim/heavy forks, IPC |
| `zss/server/main.tsx` | Server entry |
| `zss/device/rackregister.ts` | Server register (no React/Zustand) |
| `zss/feature/netterminal-server.ts` | Server PeerJS (storage-server, wrtc) |
| `zss/feature/storage-server.ts` | Server storage (fs) |
| `zss/feature/peerjs-node-polyfill.ts` | WebRTC polyfill for Node |

---

## Changelog

- **2025-03**: Initial document capturing current server mode and proposed Vite + override approach.
- **2025-03**: Implemented Vite server build, override pattern, ESM output. Dev: tsx + loader. Prod: `node dist-server/server.js`. Scripts: `yarn server` (tsx), `yarn server:dist` (built), `yarn build:server`.
