---
title: Wanix
description: First-class complex-data plane — iframe OS, zedcafe export, tasks/VM, and zedsync.
sidebar:
  order: 0
---

[Wanix](https://github.com/tractordev/wanix) is a **first-class** ZSS product surface: the primary integration for **complex data**. A browser OS (Linux v86 VM + WASI/gojs tasks) runs in a hidden `/wanix.html` iframe. Live game books export from sim MEMORY into a guest-visible `/zedcafe/` tree so tools, folder peers, and [zedsync](zedsync.mdx) can read and write allowlisted world state. Guest terminals render as colored tiles on the tape screen.

See the [system map product stack](/map#product-stack) for how Wanix sits next to the cafe UI and MEMORY.

## Guides

| Page | Topic |
|------|-------|
| [integration.mdx](integration.mdx) | Parent/iframe split, rooms, zedcafe export, drops, VM, terminals, protocol |
| [zedsync.mdx](zedsync.mdx) | Peer sync — FSA / remote 9P, seed/ready, conflicts, journal |

**Fixture testing / headed validators:** [`ops/fixtures/wanix/README.md`](ops/fixtures/wanix/README.md)

**CLI:** `#wanix` menu, `vm`, `remote`, `zedsync`, `attach` / `detach`, `stop` — see [integration](integration.mdx#how-you-start-wanix) and [zedsync](zedsync.mdx).
