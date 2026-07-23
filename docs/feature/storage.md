---
title: storage.ts
---

**Purpose**: Domain storage API for config, history, content files, and variables. All IndexedDB access goes through [`durable.ts`](../durable.ts).

## Layering

| Module | Role |
|--------|------|
| [`durable.ts`](../durable.ts) | Low-level KV (`durableget`, `durableset`, `durableupdate`, …) — only file that imports `idb-keyval` |
| [`durablecli.ts`](../durablecli.ts) | CLI/headless: hydrate/flush IDB ↔ `system.json` on disk (main thread only) |
| [`loginstorage.ts`](../loginstorage.ts) | `storagewritekey` routing + `sanitizeloginflags` (prevents config leaking into book flags) |
| `storage.ts` | Domain helpers (`storagereadconfig`, `storagewritevar`, content URL/hash, ZNS, …) |

## Exports

| Function | Args | Description |
|----------|------|-------------|
| `storagereadconfigdefault` | `name` | Read default config value |
| `storagereadconfig` | `name` | Read config from storage (async) |
| `storagewriteconfig` | `name`, `value` | Write config (async) |
| `storagereadconfigall` | — | Read all config values |
| `storagereadhistorybuffer` | — | Read command history |
| `storagewritehistorybuffer` | `historybuffer` | Write history |
| `storagereadcontent` | `filename` | Read content file |
| `storagewritecontent` | `filename`, `content` | Write content file |
| `storagereadvars` | — | Read variables |
| `storagewritevar` | `name`, `value` | Write variable (atomic update of `storage` blob) |
| `storagewatchcontent` | `player` | Watch content file changes |
| `storagesharecontent` | `player` | Share content |
| `storagenukecontent` | `player` | Delete all content files |

## Worker vs main

Sim worker and main thread call the same `storage.ts` / `durable.ts` APIs. IndexedDB is shared by origin; CLI mode mirrors IDB to `system.json` via a 2s poll on the main thread.

## Consumed By

- `zss/device/register/handlers/auth.ts`
- `zss/device/vm/handlers/auth.ts`
- `zss/memory/utilities.ts`
- `zss/firmware/element.ts`, `zss/firmware/cli/commands/permissions.ts`
- `zss/screens/terminal/input.tsx`, `component.tsx`
- `zss/gadget/engine.tsx`
