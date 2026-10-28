---
title: Architecture
description: Pointer to the ZSS architecture deep dive and runtime overview.
sidebar:
  order: 4
---

The full architecture narrative lives next to the engine:

**[`zss/ARCHITECTURE.md`](https://github.com/goldbuick/zed-software-system/blob/main/zss/ARCHITECTURE.md)**

That document covers repository layout, domain boundaries, main-thread vs workers, sim-owned tick loop, and firmware composition.

## Join mode (no sim worker)

Join tabs (`/join/`) do **not** spawn a sim worker. [`createplatform(true)`](https://github.com/goldbuick/zed-software-system/blob/main/zss/platform.ts) starts [`startjoinvm`](https://github.com/goldbuick/zed-software-system/blob/main/zss/device/joinvm.ts) on the main thread — a minimal `vm`-named device that acks operator so register can bridge. The host tab runs the authoritative sim worker; join tabs are thin clients.

Historical name "stubspace" in older docs referred to this join path; the owner module is [`zss/device/joinvm.ts`](https://github.com/goldbuick/zed-software-system/blob/main/zss/device/joinvm.ts).

## Diagrams

See [System map](./map.mdx) for Mermaid views of the product stack, realms, tick loop, and script pipeline.
