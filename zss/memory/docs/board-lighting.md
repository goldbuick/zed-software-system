# Board lighting (dark boards)

Runtime lighting for `board.isdark` lives outside [`rendering.ts`](../rendering.ts):

- [`lightinggeometry.ts`](../lightinggeometry.ts) — angular frusta (`lightingmixmaxrange`), tile Y scale, full-shadow sector merge (`memorylightingaddrangetoblocked`).
- [`boardlighting.ts`](../boardlighting.ts) — Chebyshev ring pass, occlusion collection, shading (`memoryboardlightingapplyobject`, `memoryboardlightingmarkplayer`). Occlusion strengths along a ray **add** (see `LIGHTING_OBJECT_OCCLUSION` / `LIGHTING_FULL_SHADOW_OCCLUSION`); combined occlusion plus distance falloff is **capped at 1** per shading step.

[`rendering.ts`](../rendering.ts) still re-exports the geometry helpers for existing imports.

## Tests

- [`__tests__/lightinggeometry.test.ts`](../__tests__/lightinggeometry.test.ts) — geometry merge + `lightingmixmaxrange`.
- [`__tests__/boardlighting.test.ts`](../__tests__/boardlighting.test.ts) — `memoryboardlightingapplyobject` / `memoryboardlightingmarkplayer` with Jest mocks for the heavy memory graph (see file header).

Dark-board **rendering** is still easiest to validate visually in the gadget.
