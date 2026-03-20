# Board lighting (dark boards)

Runtime lighting for `board.isdark` lives outside [`rendering.ts`](../rendering.ts):

- [`lightinggeometry.ts`](../lightinggeometry.ts) — angular frusta (`lightingmixmaxrange`), tile Y scale, full-shadow sector merge (`memorylightingaddrangetoblocked`).
- [`boardlighting.ts`](../boardlighting.ts) — Chebyshev ring pass, occlusion collection, shading (`memoryboardlightingapplyobject`, `memoryboardlightingmarkplayer`).

[`rendering.ts`](../rendering.ts) still re-exports the geometry helpers for existing imports.

## Plan / verification

Automated unit tests for this stack are **deferred** (manual / visual checks on dark boards only for now).
