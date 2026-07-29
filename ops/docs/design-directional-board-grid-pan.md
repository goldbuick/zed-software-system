# Design: directional board-grid pan (global board space)

**Status:** implemented (global slots, no settle snap) — flat / mode7 / iso / FPV  
**Goal:** Edge-exit camera glides across a path-relative board grid. Boards are placed at stable world slots; board changes **add/remove** neighbor meshes. Focus stays in world cell coords — **no** focus/corner/live rebase on settle.

**Model:**

```text
worldfocus = boardgridx * BOARD_WIDTH + localfocusx
live board at (boardgridx * W * dw, boardgridy * H * dh)
neighbors at their grid slots relative to the same origin
```

On east edge exit: `boardgridx += 1`. Live content swaps to the new board **at the new slot**. Old board remains as a west preview. Settle only drops depth-2 / clears `panphase`.

**Sync:** Live offset and exit-preview grid share `boardgridx/y` ([`panviewsync.ts`](../../zss/gadget/graphics/panviewsync.ts) `readboardgridforrender` includes pending edge bump before useFrame). Depth-2 via `panphase` + bias. **Never `flushSync` mid-`useFrame`**. No settle focus remap.

**DOF:** Focus distance must use `setdofplayerworld` on the **live board** group (local control focus), not corner-local coords. After global slots, corner tracks world focus while the player mesh lives on the offset live board — mixing those spaces blows out bloom/DOF.

**Default:** During a cardinal board change, render **one extra board in the travel direction** (depth-2) and glide in world space. Steady play is a 3×3. Pan motion is **cardinal only** (travel-axis damp; cross-axis frozen).

`#goto` / non-edge: reset `boardgridx/y` to `0` and teleport focus to local control.

## Implementation checklist

- [x] Cardinal depth-2 exit ids on gadget layers
- [x] Path-relative `boardgridx/y` + world focus targets
- [x] Exit previews placed by grid slots (no departure-window rebase)
- [x] Live board always at world slot
- [x] Cardinal axis lock
- [x] Settle clears panphase only (no snap)
- [x] FPV wired to the same global grid
- [x] mode7 / iso / FPV DOF via liveboard localToWorld

## Sequencing

```text
Steady:     3x3 around (gx, gy); focus = gx*W + local
Edge exit:  gx += bias; live at new slot; depth-2 ahead; glide world focus
Settle:     clear panphase / depth-2; focus unchanged
Goto:       gx=gy=0; teleport focus to local
```

```text
Frame A — on A at gx=0, approaching east edge
[ W ][ A* ][ B ]

Frame B — crossed to B (gx=1); panphase; e2 added
[ A  ][ B* ][ e2 ]
        ^ focus continuous near boundary

Frame C — settled; e2 removed
[ A  ][ B* ][ E ]
```

## Primary files

| File | Role |
|---|---|
| [`zss/gadget/graphics/camerafocus.ts`](../../zss/gadget/graphics/camerafocus.ts) | `boardgridx/y`, world targets, cardinal glide |
| [`zss/gadget/graphics/exitpreviewgroups.ts`](../../zss/gadget/graphics/exitpreviewgroups.ts) | World-slot previews + depth-2 while panphase |
| [`zss/gadget/graphics/panviewsync.ts`](../../zss/gadget/graphics/panviewsync.ts) | Pending grid + live world offset + DOF helper |
| `flat.tsx` / `mode7.tsx` / `iso.tsx` / `fpv.tsx` | Consumers |

## Out of scope

- Persisted absolute board coordinates / shared multiplayer origin
- Anticipatory bias before exit
- Depth-2 diagonals
- Live neighbor co-sim

## Success criteria

- Cardinal edge exits: continuous world focus; settle does not remap
- Boards appear/disappear at fixed slots; no opposite-direction settle lurch
- Steady play: 3×3 (+ depth-2 only while `panphase`)
- `#goto` teleports (grid reset)
- mode7 / iso / FPV DOF tracks the live sprite after board crosses
- Unit tests lock continuous world focus across one east exit
