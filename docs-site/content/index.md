---
title: Introduction
description: Zed Cafe docs -- guides for making worlds, plus the system reference for ZSS.
sidebar:
  order: 0
---

[Zed Cafe](https://zed.cafe/) is a browser workshop for making small text-mode worlds. You build boards out of terrain and objects, script them in ZSS (a language in the spirit of ZZT-OOP), add music and speech, and share a link so others can play, alone or together.

## Start creating

New here? Work through the guides in order. Each takes 10-20 minutes in the browser.

1. [Your first ten minutes](/guides/first-ten-minutes) -- the terminal, help, starter kits, books, and pages
2. [Your first board](/guides/first-board) -- build two rooms, connect them, save, and share
3. [Your first object](/guides/first-object) -- write ZSS: stats, labels, flags, messages, and scroll links

See [Guides](/guides) for the vocabulary the guides use.

## Look things up

- [Firmware commands](/firmware/commands) -- every `#command` in one list
- [Features](/features) -- what the engine can do, grouped by area
- [Glossary](/glossary) -- shared vocabulary
- [Synth](/synth) -- music, sound effects, and the voice and effect chain

## Two "docs" surfaces

| Surface | URL | Audience |
|---------|-----|----------|
| This site | [https://zed.cafe/docs/](https://zed.cafe/docs/) | Creators learning to build, and developers reading architecture / API narrative |
| In-game / ZNS help | [https://docs.at.zed.cafe](https://docs.at.zed.cafe) | Players and authors via ROM refscrolls (`#help` in the terminal) |

ROM help under `zss/rom/` stays in the product runtime. It is not a Blume source.

## How it works (developers)

- [System map](/map) -- product stack, workers, tick, script pipeline
- [Architecture deep dive](/architecture) -- points at `zss/ARCHITECTURE.md`

Module manuals are colocated under `zss/**/docs/` and mounted into this site:

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
yarn task blume dev
```

Opens Blume with `docs-site/` as cwd (repo-root `yarn blume` looks for the wrong folder). Production pages ship via `yarn task run cafe:build` into `cafe/dist/docs/`. Guides live in `docs-site/content/guides/`.
