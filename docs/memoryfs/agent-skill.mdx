---
title: memoryfs agent skill
description: Copy-paste Cursor / Claude skill for reading and writing memoryfs
---

# Agent skill (copy-paste)

Canonical project skill: `.cursor/skills/memoryfs/SKILL.md`. Claude Code: `.claude/skills/memoryfs` → same folder.

**Install elsewhere:** create `.cursor/skills/memoryfs/SKILL.md` (or `.claude/skills/memoryfs/SKILL.md`) and paste the block below.

Select all inside the fence, copy, paste into `SKILL.md`:

````markdown
---
name: memoryfs
description: >-
  Read and write the cafe projected MEMORY tree under memoryfs/. Use when the
  user mentions memoryfs, board/terrain.json styling, live book/page/flag edits
  via a dropped folder, or #memoryfs.
---

# memoryfs (projected MEMORY)

## When to use

- Editing a **live** cafe projection: `<drop-folder>/memoryfs/` (e.g. `zed-workspace/memoryfs`)
- Restyling boards (`**/board/terrain.json`), pages, flags, or book meta on that tree
- Explaining attach / sync / detach behavior

**Not for:**

- Template authoring under `ops/fixtures/content/templates/` — use skill `book-content`
- jsonpipe / boardrunner worker sync — that is not disk projection
- Implementing cafe FSA internals unless the user asks for feature work (see code owners below)

## Attach and sync (must follow)

- **Chromium only** (File System Access). Safari/Firefox fail loud.
- Drop a folder onto cafe. Sync root is always **`memoryfs/`** inside that folder.
- **Attach** = nuclear-clear `memoryfs/` then full export from current MEMORY. Does **not** open a project from disk.
- **Live bidirectional** after attach: MEMORY → disk write-through; disk → MEMORY reload. Debounce / poll ~**2s**.
- After you edit files, cafe must stay attached; wait briefly for inbound apply.
- **Detach:** `#memoryfs detach` — stops immediately, **no** final flush. `#memoryfs status` for attach state.

## Tree (allowlisted paths only)

Paths are relative to the `memoryfs/` sync root:

```text
memoryfs/
  stats.json                          # software.main/temp + book index
  books/{kebab-name}-{id}/
    stats.json                        # id, name, token, activelist, pages[]
                                      # NO timestamp; NO inline flags blob
    flags/{owner}/stats.json          # mirrored owners only
    pages/{kebab-name}-{id}/
      stats.json                      # id, code, type, name
      board/stats.json
      board/terrain.json              # length 1500 (60x25)
      board/objects/{objId}.json
      object/element.json
      terrain/element.json
      charset/bitmap.json
      palette/bitmap.json
```

Sibling files **outside** `memoryfs/` are ignored.

## Read / write playbook

- Prefer editing existing allowlisted JSON. Preserve `id`, `kind`, and structure.
- **Boards:** `board/terrain.json` is an array of **1500** cells (60 wide × 25 tall). Index `i` → `x = i % 60`, `y = i / 60`. Cells are objects with `kind`; `char` / `color` / `bg` appear only when they differ from the `@terrain` kind, so an absent field means "same as kind". Adding one back overrides the kind again.
- **Colors:** ZSS `COLOR` enum 0–15 in `zss/words/types.ts`. Field `color` is foreground; `bg` is background.
- **Flags:** edit `flags/{owner}/stats.json` (`Record` of flag name → value). Deleting the owner folder / file clears that bag in MEMORY.
- **Read-only:** `board/objects/{pid_*}.json` is MEMORY → disk only. External edits/deletes do **not** change MEMORY (file may be restored on next export).
- **Do not** create flag owners ending in `_chip`, `_tracking`, `_layers`, `_synth`, `_gadget` (filtered; never mirrored).
- **Do not** write `timestamp` into book `stats.json`.
- Keep valid JSON and a trailing newline (matches cafe export style).

## Safe edit checklist

1. Path is under `.../memoryfs/` and matches the allowlisted layout.
2. Bulk restyles (ANSI stamp, palette pass): script over all `**/board/terrain.json`; **preserve `kind`**.
3. Remind the user cafe must remain attached for disk → MEMORY apply.
4. If nothing updates in-game after ~2–4s, check `#memoryfs status` and that edits were under `memoryfs/`, not the drop-folder root.

## Code owners (feature work only)

Implementation: `zss/feature/memoryfs/`. Narrative docs: `zss/feature/memoryfs/docs/` (Blume `/docs/memoryfs/`). Device wiring: register FSA handlers + VM sync; cafe drop in `cafe/cafeapp.tsx`.
````
