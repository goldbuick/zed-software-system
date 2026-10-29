---
title: wfcoverlapping.ts
---

**Purpose**: Exports `wfcoverlappinggenerate` — overlapping wave function collapse used by `boardremix`. Port of the fast-wfc propagator (Mathieu Fehr and Nathanaelle Courant, MIT).

## Dependencies

- none

## Exports

| Function | Args | Description |
|----------|------|-------------|
| `wfcoverlappinggenerate` | `input`, `width`, `height`, `patternsize`, `outwidth`, `outheight`, `symmetry`, `random` | RGBA in, RGBA out. Periodic input, non-periodic output. `symmetry` is 1..8. Returns `undefined` on contradiction |

## Algorithm

- Extracts N-by-N patterns from the input, wrapping at the edges, and keeps the first `symmetry` rotations and reflections
- Weights patterns by how often they occur, then precomputes which patterns agree on their N-1 overlap
- Bans a pattern as soon as a neighbor's support count hits zero, and updates entropy in constant time
- Returns `undefined` instead of retrying when a cell has no pattern left
