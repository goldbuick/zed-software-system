---
title: Introduction
description: Zed Cafe developer documentation — system reference for ZSS.
sidebar:
  order: 0
---

Welcome to the **ZSS System Reference** — architecture, glossary, feature overview, and colocated module manuals for [zed.cafe](https://zed.cafe/).

## Two "docs" surfaces

| Surface | URL | Audience |
|---------|-----|----------|
| This site | [https://zed.cafe/docs/](https://zed.cafe/docs/) | Developers and creators reading architecture / API narrative |
| In-game / ZNS help | [https://docs.at.zed.cafe](https://docs.at.zed.cafe) | Players and authors via ROM refscrolls |

ROM help under `zss/rom/` stays in the product runtime. It is not a Blume source.

## Start here

- [System map](./map.md) — stack, workers, tick, script pipeline
- [Glossary](./glossary.md) — shared vocabulary
- [Features](./features/index.md) — capability tables by domain
- [Architecture deep dive](./architecture.md) — points at `zss/ARCHITECTURE.md`
- [Firmware commands](/firmware/commands) — canonical `#command` list for the web

## Module manuals

Colocated under `zss/**/docs/` and mounted into this site:

| Prefix | Source |
|--------|--------|
| `/memory` | `zss/memory/docs` |
| `/feature` | `zss/feature/docs` |
| `/synth` | `zss/feature/synth/docs` |
| `/lang` | `zss/feature/lang/docs` |
| `/parse` | `zss/feature/parse/docs` |
| `/firmware` | `zss/firmware/docs` |
| `/gadget` | `zss/gadget/docs` |
| `/mapping` | `zss/mapping/docs` |
| `/words` | `zss/words/docs` |
| `/device` | `zss/device/docs` |
| `/ops` | selected evergreen pages in `ops/docs` |

## Local authoring

From the repo root:

```bash
yarn blume dev
```

Run inside `docs-site/` (or `yarn --cwd docs-site blume dev`). Production pages ship via `yarn task run cafe:build` into `cafe/dist/docs/`.
