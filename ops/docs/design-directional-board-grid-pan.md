# Design: directional board-grid pan

**Status:** implemented (v1) + wait-before-start/settle  
**Goal:** Extend the existing 3×3 exit-preview grid with one extra column or row in the travel direction during edge-exit camera glides, so the pan never hits void. Build on `buildexitpreviewgroups` + `stepfocuswithboardtransition` — no new camera system.

**Sync (wait-before-start/settle):** Live-board offset and exit-preview grid share one visual `PanView` ([`panviewsync.ts`](../../zss/gadget/graphics/panviewsync.ts)). On board change, pending bias mounts the departure strip in React first; `useLayoutEffect` offsets the live board before paint. On settle, focus remap is **deferred** (`panrecenterpending`); committed panview lags until React clears the strip, then the same `useLayoutEffect` runs `applypanrecenter` + live to origin + corner snap. **Never `flushSync` mid-`useFrame`**. Live board must not move in `useFrame` ahead of the committed strip.

**Default:** During a cardinal board change, render **one extra board in the travel direction** (depth-2) and **pan first** in the departure frame; only after the pan settles, snap/recenter and clear the extra edge. Do **not** always render a full 5×5. Pan motion is **cardinal only** (travel-axis damp; cross-axis frozen).

## Implementation checklist

- [x] Add cardinal depth-2 exit id resolution and plumb onto `MEMORY_GADGET_LAYERS` / `GADGET_STATE`
- [x] Track travel `GridBias` in camerafocus for the edge-glide lifetime (set on edge exit, clear when settled)
- [x] Extend `buildexitpreviewgroups` to place ±2 board offsets when bias is non-zero
- [x] Pass bias from flat/mode7/iso into the preview builder
- [x] Unit tests for depth-2 positions, bias set/clear, and exit id walk
- [x] **Pan first, then camera snap** (invert legacy snap-then-glide)
- [x] Cardinal axis lock (no diagonal glide)
- [x] Wait-before-start/settle (no flushSync; layout-only live offset)
- [x] Atomic settle recenter (deferred focus remap + layout live 0 + corner snap)

## Sequencing (v1)

```text
OLD:  board change → SNAP focus → short pan → settle
NEW:  board change → bias + depth-2 → PAN in departure frame → SNAP/recenter + clear bias
```

```text
Wait-before-start
  board change → React mounts departure strip → layout offsets live → paint → damp/pan

Wait-before-settle (atomic)
  focus settled → panrecenterpending (keep departure focus)
               → setpanview idle (strip lags via committed panview)
               → layout: applypanrecenter + live 0 + corner snap → paint
```

```text
Frame A — visually on C, bias=+east, EE added
[ W ][ C* ][ E ][ EE ]
        ^ camera starts near east of C
        ======= pan east =======>

Frame B — mid pan (no origin snap yet)
[ W ][ C  ][ E ][ EE ]
              ^ crossing into E; EE fills far edge

Frame C — pan settled; snap/recenter; clear bias
        [ C ][ E* ][ E's east ]
              ^ origin moved; added EE column removed
```

## What you have today (baseline)

Boards are **not** co-simulated. The client draws a **3×3 visual window**: live current board at origin + up to 8 exit previews from `layercachemap` (or fog).

Exit walk ([`boardcornerexits.ts`](../../zss/memory/boardcornerexits.ts) + [`boarddepth2exits.ts`](../../zss/memory/boarddepth2exits.ts) + [`rendering.ts`](../../zss/memory/rendering.ts)):

- Cardinals: `board.exitnorth|south|west|east`
- Depth-2: `exiteast2` = east board’s `exiteast`, etc.
- Diagonals: two-step walk; disputed → `CORNER_EXIT_DISPUTED`

Camera ([`camerafocus.ts`](../../zss/gadget/graphics/camerafocus.ts)):

1. On cardinal edge exit: set `GridBias`, start `panphase`, keep focus in departure frame, damp **travel axis only** toward `pantarget`.
2. Live board mesh is offset by bias during pan (layout, after strip mounts); departure-centered previews include depth-2 ahead.
3. When focus near pantarget and smooth near `FOCUS_ANIM_RATE`: mark `panrecenterpending` (do not remap yet); clear panphase. Layout then remaps focus, snaps corner, and resets live board with strip teardown.

`#goto` / non-edge moves: no panphase / no bias.

## Primary files

| File | Change |
|---|---|
| [`zss/memory/boarddepth2exits.ts`](../../zss/memory/boarddepth2exits.ts) | Resolve cardinal depth-2 ids |
| [`zss/memory/rendering.ts`](../../zss/memory/rendering.ts) + gadget types | Plumb `exit*2` onto gadget layers |
| [`zss/gadget/graphics/exitpreviewgroups.ts`](../../zss/gadget/graphics/exitpreviewgroups.ts) | Place depth-2 / departure window when biased |
| [`zss/gadget/graphics/camerafocus.ts`](../../zss/gadget/graphics/camerafocus.ts) | Pan-first then recenter; cardinal axis lock |
| [`zss/gadget/graphics/panviewsync.ts`](../../zss/gadget/graphics/panviewsync.ts) | Pending + settle-lag visual PanView |
| `flat.tsx` / `mode7.tsx` / `iso.tsx` | Strip + layout live offset; no flushSync |

## Out of scope (still)

- Anticipatory bias before the player exits
- Depth-2 diagonals
- FPV wiring
- Live neighbor co-sim
- Changing playermove / exit ownership

## Success criteria

- Cardinal edge exit: camera pans across a filled strip (depth-2), then recenters without void
- No one-frame black hole at entry or settle
- Steady play: still a 3×3 (no permanent 5×5 cost)
- Diagonal previews unchanged unless depth-2 diagonals are added later
- `#goto` / non-edge moves remain non-gliding
