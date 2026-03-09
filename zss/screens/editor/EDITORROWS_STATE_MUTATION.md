# EditorRows and shared tile state mutation — root cause

## Summary

`EditorRows` (and other editor/tape components) **mutate shared tile state during render**. The same `WriteTextContext` is used by multiple components that all write into one `char` / `color` / `bg` buffer. Render order is not guaranteed, so overlapping writes produce order-dependent, inconsistent output and can “mess up” the display (e.g. marquee overwritten, wrong content, stale fingerprint).

---

## How the tile buffer is shared

1. **Single store, single context**  
   `TapeLayoutTiles` (tape/layouttiles.tsx) creates one tiles store and one write context that holds **references** to the store’s arrays:

   - `context.char`, `context.color`, `context.bg` are the same arrays as `store.getState().char` (etc.).
   - That context is provided via `WriteTextContext.Provider` to the whole editor tree.

2. **One buffer, many writers**  
   Under the editor, these components all call `useWriteText()` and write into that same buffer **during their render**:

   - `TapeBackPlate` — backplate / border
   - `EditorFrame` — frame/chrome
   - `EditorRows` — code lines (when enabled)
   - `EditorInput` — cursor, selection, input
   - `ScrollMarquee` — marquee line (e.g. row 0)

   There is no separate buffer per component; they all mutate the same `char`/`color`/`bg` arrays.

3. **Writes are in-place**  
   Helpers in `zss/words/textformat.ts` (e.g. `tokenizeandwritetextformat`, `writeplaintext`, `clippedapplycolortoindexes`, `clippedapplybgtoindexes`) write by indexing into `context.char[i]`, `context.color[i]`, `context.bg[i]`. So every such call mutates the shared buffer.

---

## Why EditorRows is “messing up” state

1. **Mutation during render**  
   `EditorRows` runs a loop over rows and, for each line:

   - Sets `context.x`, `context.y`, `context.active.*`, `context.disablewrap`, etc.
   - Calls `writeplaintext`, `clippedapplycolortoindexes`, `clippedapplybgtoindexes`, `applycodetokencolors`, etc.

   All of this runs **during the component’s render**, not in an effect or after commit. So React’s “render” phase is doing side effects (mutating shared buffers). That breaks the assumption that render is pure and can be repeated or reordered.

2. **Order-dependent result**  
   React does not guarantee the order in which sibling (or nested) components render. So the effective order of writers is undefined:

   - If `EditorRows` runs before `ScrollMarquee`, it may advance `context.y` and write over row 0; then `ScrollMarquee` writes row 0 and may conflict or be overwritten on a later pass.
   - If `ScrollMarquee` runs first and writes row 0, then `EditorRows` runs and writes code (including possibly row 0), the marquee can be overwritten.

   So the same logical “frame” can show different content depending on render order. That’s why the fingerprint can look unchanged or wrong and why the marquee can disappear or show stale content.

3. **No clear ownership or ordering**  
   There is no single “paint” phase that:

   - Clears the buffer, or
   - Runs writers in a defined order (e.g. backplate → frame → rows → input → marquee).

   Each component just runs when React renders it and mutates the same buffer. Overlapping regions (e.g. row 0 for marquee vs first code line) are undefined.

4. **Strict Mode / double render**  
   In React Strict Mode, render can be invoked twice. With mutable shared state, the second run can see a buffer already modified by the first run, so output can be duplicated, missing, or corrupted.

---

## Root cause in one sentence

**Multiple components (including EditorRows) mutate the same tile buffer (`context.char` / `color` / `bg`) during render, with no single owner or defined write order, so the final image is order-dependent and can overwrite or corrupt each other’s output (e.g. marquee vs code).**

---

## Possible directions for a fix

- **Single paint phase**  
  One component (or one effect) that owns the buffer and runs all writers in a fixed order (e.g. clear → backplate → frame → rows → input → marquee), then triggers a single “commit” to the store (e.g. `changed()` once).

- **Copy-on-write or regions**  
  Each writer gets a copy of the region it cares about, writes into that, then a final step merges copies into the store buffer (more allocation, but no shared mutation during render).

- **Defer writes**  
  Writers don’t touch the buffer during render; they enqueue “draw” commands (e.g. list of (x, y, char, color, bg) or high-level ops). A single effect or `useLayoutEffect` runs after the tree is committed and applies those commands in a defined order.

- **One writer per row/region**  
  If regions are disjoint (e.g. marquee only row 0, code only rows 2..n), document and enforce that so only one component writes each cell; then at least the bug is “who runs last” only at boundaries.

---

## References

- `zss/screens/editor/editorrows.tsx` — loop over rows, mutates `context` and calls write helpers.
- `zss/screens/tape/layouttiles.tsx` — creates store and `WriteTextContext` for the editor.
- `zss/words/textformat.ts` — `writetextformat`, `writeplaintext`, `clippedapplycolortoindexes`, etc., mutate `context.char` / `color` / `bg`.
- `zss/gadget/writetext.ts` — `WriteTextContext` definition and `useWriteText()`.
