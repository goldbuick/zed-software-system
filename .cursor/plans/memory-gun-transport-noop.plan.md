---
name: MEMORY Gun noop mesh
overview: Attach explicit no-op mesh transport to the local MEMORY Gun (`memorygunroot`) so Gun sees defined `hi` / `bye` / `hear` without enabling real peer routing; keep full `Gun.Mesh` on `roomgun` where gunsync depends on it.
todos:
  - id: add-noop-mesh-helper
    content: Add helper that sets gun._.opt.mesh to stub hi/hear/bye (normalize peers object first, match roommirror peers setup)
  - id: wire-memoryguninit
    content: Call noop mesh helper in memoryguninit immediately after Gun(...) before get('memory')
  - id: leave-roommirror
    content: Leave roommirror.ts on Gun.Mesh(root) unless we later decide to share only peer normalization
  - id: verify-tests
    content: Run gundocument.roottree + gunsync tests
---

# MEMORY Gun: no-op transport handlers

## Goal

Per request: **initial transport handlers should be no-ops**—not `Gun.Mesh(root)`, which runs full mesh logic.

## Behavior

- **`memorygunroot.ts`**: After `Gun({ peers: [], ... })`, ensure `gun._.opt.peers` is a plain object `{}` (same normalization as [`roommirror.ts`](zss/feature/gunsync/roommirror.ts)), then set **`opt.mesh`** to an object whose **`hi`**, **`bye`**, and **`hear`** are **empty functions** (discard inbound frames; never relay). With `peers: []`, nothing should call them except stray internals—behavior stays strictly local.

- **`roommirror.ts`**: **Do not switch to no-op mesh here.** [`hubgunwire.ts`](zss/feature/gunsync/hubgunwire.ts) uses `mesh.hi`, `mesh.hear`, and synthetic peers for hub relay; replacing with no-ops would break gunsync ingress/outbound.

## Optional refactor

If both files need identical **`peers` normalization** only, extract a tiny `gunoptnormalizepeers(g)`; keep **two** mesh strategies: noop for MEMORY Gun, `GunMesh(root)` for `roomgun`.

## Verification

- Existing [`zss/memory/__tests__/gundocument.roottree.test.ts`](zss/memory/__tests__/gundocument.roottree.test.ts) should still pass.
- Gunsync tests unchanged if `roommirror` stays on real mesh.

## Out of scope

Bridging MEMORY Gun to hub/wire—still separate from attaching noop stubs for local core-only Gun builds.
