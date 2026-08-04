---
title: memoryfs agent skill
description: Agent skills for reading and writing memoryfs (emitted on cafe attach)
---

# Agent skills

On **full attach/export**, cafe writes skill sidecars at the **drop-folder root** (sibling of `memoryfs/`):

```text
<drop>/
  AGENTS.md
  .cursor/skills/memoryfs/SKILL.md
  .cursor/skills/memoryfs-board/SKILL.md
  .cursor/skills/memoryfs-flags/SKILL.md
  .claude/skills/memoryfs/SKILL.md      # identical bodies
  .claude/skills/memoryfs-board/SKILL.md
  .claude/skills/memoryfs-flags/SKILL.md
  memoryfs/                             # JSON projection only
```

Source of truth: [`skills.ts`](../skills.ts) (`buildmemoryfsskills`). In-repo copies for this project: `.cursor/skills/memoryfs/SKILL.md` and `.claude/skills/memoryfs/SKILL.md`.

Skills are **not** MEMORY data -- they are outside `memoryfs/`, ignored by poll/apply, and not nuclear-cleared with the JSON tree.

## Overview skill body (reference)

Same text as the emitted `memoryfs` skill (Cursor and Claude):

````markdown
---
name: memoryfs
description: >-
  Read and write the cafe projected MEMORY tree under memoryfs/. Use when the
  user mentions memoryfs, live book/page/flag edits via a dropped folder, or
  #memoryfs. For board cells see memoryfs-board; for flags see memoryfs-flags.
---

# memoryfs (projected MEMORY)

## When to use

- Editing a **live** cafe projection: `<drop-folder>/memoryfs/`
- Explaining attach / sync / detach behavior
- Book / page meta under allowlisted JSON paths

**Not for:**

- Template authoring under `ops/fixtures/content/templates/` -- use skill `book-content` when available
- jsonpipe / boardrunner worker sync -- that is not disk projection

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
- Board cells: see skill `memoryfs-board`.
- Flags: see skill `memoryfs-flags`.
- **Read-only:** `board/objects/{pid_*}.json` is MEMORY -> disk only. External edits/deletes do **not** change MEMORY (file may be restored on next export).
- **Do not** write `timestamp` into book `stats.json`.

## Safe edit checklist

1. Path is under `.../memoryfs/` and matches the allowlisted layout.
2. Remind the user cafe must remain attached for disk -> MEMORY apply.
3. If nothing updates in-game after ~2-4s, check `#memoryfs status` and that edits were under `memoryfs/`, not the drop-folder root.
````
