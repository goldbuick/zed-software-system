---
name: wanix-term-sizing
description: >-
  How the wanix terminal grid (cols x rows) is sized in zed.cafe. Use when
  editing or debugging wanix terminal sizing, when guest output wraps wrong /
  ignores the tile width, or whenever tempted to add winsize/winch/stty/setsize
  propagation. The fix is ALWAYS pixel-sizing the iframe and letting xterm's
  FitAddon do its job.
---

# Wanix terminal sizing

Full reference: [ops/docs/wanix-term-sizing.md](../../../ops/docs/wanix-term-sizing.md)

## The one true approach

The host (zed.cafe) sizes the **iframe element** in pixels to `cols x rows`. The
child `<wanix-term>` fills the iframe; xterm's `FitAddon` + `ResizeObserver`
compute cols/rows from that pixel box. That is the entire sizing mechanism.

- Fixed xterm cell constants: `WANIX_CHAR_WIDTH = 9`, `WANIX_CHAR_HEIGHT = 18` in
  [zss/feature/wanix/wanixtermiframehost.ts](../../../zss/feature/wanix/wanixtermiframehost.ts).
- `iframeapplytermsize(cols, rows)` sets iframe px to `(cols+1)*9` × `rows*18`
  (+1 col for scrollbar). Reapplied on iframe (re)creation in `ensureiframe`.
- Host entry point: `wanixhostapplytermsize(cols, rows)` in
  [zss/feature/wanix/wanixhost.ts](../../../zss/feature/wanix/wanixhost.ts),
  called from [zss/screens/terminal/wanixscreen.tsx](../../../zss/screens/terminal/wanixscreen.tsx)
  on tile resize with `edge.width`/`edge.height`.
- The `<wanix-term>` probe layout fills the viewport (`100vw`/`100vh`) so fit
  follows the iframe — see
  [zss/feature/wanix/wanixtermprobe.ts](../../../zss/feature/wanix/wanixtermprobe.ts).
- Content mirror: 100ms cell snapshot poll + push on fit-size change; tile GPU
  needs `context.changed()` after `writetile` in `WanixTermScreen`.

## Never do these (they were ripped out for a reason)

- NO `winch` file writes (`#term/$rid/winch`, `#vm/<rid>/term/winch`). Wanix
  stubs resize→program propagation on purpose; it does nothing.
- NO `stty cols/rows` injection into the guest serial.
- NO `setsize` probe RPC / explicit `term.resize(cols, rows)`. The FitAddon's
  `ResizeObserver` overrides explicit resizes anyway — they fight and lose.
- NO measuring real cell dimensions, no reading `_renderService.dimensions`.
  Use the fixed 9×18 constants.
- NO `80x24` anywhere. It is a dead VT100 default, not a target. The only size
  that matters is the tile (`edge.width x edge.height`).
- NO patching `submodules/wanix` / v86 to propagate winsize.

There is also NO size message needed from xterm to zed.cafe: the tile already
knows its own dimensions. Content arrives via cell snapshots in
[zss/feature/wanix/wanixtermscreen.ts](../../../zss/feature/wanix/wanixtermscreen.ts).

## If sizing looks wrong

The fix lives on the **display side** (iframe pixel size / FitAddon), not in
guest winsize propagation. Adjust the cell constants or the iframe pixel math.
Do not reintroduce any of the "Never do these" mechanisms.

## Meta

When the user says stop pursuing an approach (e.g. "no winch"), stop on the
first request. Do not re-propose it.
