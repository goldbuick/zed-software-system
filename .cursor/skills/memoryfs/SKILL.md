---
name: memoryfs
description: >-
  Read and write the cafe projected MEMORY tree under memoryfs/. Use when the
  user mentions memoryfs, live book/page/flag edits via a dropped folder, or
  #memoryfs. For board cells see memoryfs-board; for flags see memoryfs-flags.
---

# memoryfs (projected MEMORY)

## When to use

- Editing a **live** cafe projection: `<drop-folder>/memoryfs/` (e.g. `zed-workspace/memoryfs`)
- Explaining attach / sync / detach behavior
- Book / page meta under allowlisted JSON paths

**Not for:**

- Template authoring under `ops/fixtures/content/templates/` -- use skill `book-content`
- jsonpipe / boardrunner worker sync -- that is not disk projection
- Implementing cafe FSA internals unless the user asks for feature work (see code owners below)

## Attach and sync (must follow)

- **Chromium only** (File System Access). Safari/Firefox fail loud.
- Drop a folder onto cafe. Sync root is always **`memoryfs/`** inside that folder.
- **Attach** = nuclear-clear `memoryfs/` then full export from current MEMORY. Does **not** open a project from disk.
- Cafe also writes agent skills at the drop root (`AGENTS.md`, `.cursor/skills/`, `.claude/skills/`) -- not inside `memoryfs/`.
- **Live bidirectional** after attach: MEMORY -> disk write-through; disk -> MEMORY reload. Debounce / poll ~**2s**.
- After you edit files, cafe must stay attached; wait briefly for inbound apply.
- **Detach:** `#memoryfs detach` -- stops immediately, **no** final flush. `#memoryfs status` for attach state.

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

Sibling files **outside** `memoryfs/` are ignored by MEMORY apply (skills at drop root are intentional sidecars).

## Read / write playbook

- Prefer editing existing allowlisted JSON. Preserve `id`, `kind`, and structure.
- Keep valid JSON and a trailing newline (matches cafe export style).
- Board cells: see skill `memoryfs-board` (emitted on attach).
- Flags: see skill `memoryfs-flags` (emitted on attach).
- **Read-only:** `board/objects/{pid_*}.json` is MEMORY -> disk only. External edits/deletes do **not** change MEMORY (file may be restored on next export).
- **Do not** write `timestamp` into book `stats.json`.

## Safe edit checklist

1. Path is under `.../memoryfs/` and matches the allowlisted layout.
2. Bulk restyles (ANSI stamp, palette pass): script over all `**/board/terrain.json`; **preserve `kind`**.
3. Remind the user cafe must remain attached for disk -> MEMORY apply.
4. If nothing updates in-game after ~2-4s, check `#memoryfs status` and that edits were under `memoryfs/`, not the drop-folder root.

## Code owners (feature work only)

Implementation: `zss/feature/memoryfs/` (emit: `skills.ts`). Narrative docs: `zss/feature/memoryfs/docs/` (Blume `/docs/memoryfs/`). Device wiring: register FSA handlers + VM sync; cafe drop in `cafe/cafeapp.tsx`.
