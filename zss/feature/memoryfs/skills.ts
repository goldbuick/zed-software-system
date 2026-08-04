/** Static agent skill sidecars written to the drop-folder root on full sync. */

export type MEMORYFS_SKILL_FILE = {
  path: string
  bytes: Uint8Array
}

const encoder = new TextEncoder()

function encodetext(text: string): Uint8Array {
  return encoder.encode(text.endsWith('\n') ? text : `${text}\n`)
}

/** Skill topic names (directory under .cursor/skills and .claude/skills). */
export const MEMORYFS_SKILL_NAMES = [
  'memoryfs',
  'memoryfs-board',
  'memoryfs-flags',
] as const

export type MEMORYFS_SKILL_NAME = (typeof MEMORYFS_SKILL_NAMES)[number]

export const MEMORYFS_SKILL_BODIES: Record<MEMORYFS_SKILL_NAME, string> = {
  memoryfs: `---
name: memoryfs
description: >-
  Read and write the cafe projected MEMORY tree under memoryfs/. Use when the
  user mentions memoryfs, live book/page/flag edits via a dropped folder, or
  #memoryfs. For board cells see memoryfs-board; for flags see memoryfs-flags.
---

# memoryfs (projected MEMORY)

## When to use

- Editing a **live** cafe projection: \`<drop-folder>/memoryfs/\`
- Explaining attach / sync / detach behavior
- Book / page meta under allowlisted JSON paths

**Not for:**

- Template authoring under \`ops/fixtures/content/templates/\` -- use skill \`book-content\` when available
- jsonpipe / boardrunner worker sync -- that is not disk projection

## Attach and sync (must follow)

- **Chromium only** (File System Access). Safari/Firefox fail loud.
- Drop a folder onto cafe. Sync root is always **\`memoryfs/\`** inside that folder.
- **Attach** = nuclear-clear \`memoryfs/\` then full export from current MEMORY. Does **not** open a project from disk.
- Cafe also writes agent skills at the drop root (\`AGENTS.md\`, \`.cursor/skills/\`, \`.claude/skills/\`) -- not inside \`memoryfs/\`.
- **Live bidirectional** after attach: MEMORY -> disk write-through; disk -> MEMORY reload. Debounce / poll ~**2s**.
- After you edit files, cafe must stay attached; wait briefly for inbound apply.
- **Detach:** \`#memoryfs detach\` -- stops immediately, **no** final flush. \`#memoryfs status\` for attach state.

## Tree (allowlisted paths only)

Paths are relative to the \`memoryfs/\` sync root:

\`\`\`text
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
\`\`\`

Sibling files **outside** \`memoryfs/\` are ignored by MEMORY apply (skills at drop root are intentional sidecars).

## Read / write playbook

- Prefer editing existing allowlisted JSON. Preserve \`id\`, \`kind\`, and structure.
- Keep valid JSON and a trailing newline (matches cafe export style).
- Board cells: see skill \`memoryfs-board\`.
- Flags: see skill \`memoryfs-flags\`.
- **Read-only:** \`board/objects/{pid_*}.json\` is MEMORY -> disk only. External edits/deletes do **not** change MEMORY (file may be restored on next export).
- **Do not** write \`timestamp\` into book \`stats.json\`.

## Safe edit checklist

1. Path is under \`.../memoryfs/\` and matches the allowlisted layout.
2. Remind the user cafe must remain attached for disk -> MEMORY apply.
3. If nothing updates in-game after ~2-4s, check \`#memoryfs status\` and that edits were under \`memoryfs/\`, not the drop-folder root.
`,

  'memoryfs-board': `---
name: memoryfs-board
description: >-
  Edit memoryfs board terrain and objects under **/board/. Use when restyling
  board/terrain.json, ANSI stamps, palette passes, or board cell kind/char/color.
---

# memoryfs boards

## Paths

Under each page: \`books/.../pages/.../board/\`

- \`terrain.json\` -- array of **1500** cells (60 wide x 25 tall)
- \`stats.json\` -- board stats (non-terrain fields)
- \`objects/{objId}.json\` -- one object per file

## Terrain cells

- Index \`i\` -> \`x = i % 60\`, \`y = i / 60\` (integer division).
- Cells are objects with \`kind\`.
- \`char\` / \`color\` / \`bg\` appear only when they differ from the \`@terrain\` kind; an absent field means "same as kind". Adding one back overrides the kind again.
- Bulk restyles (ANSI stamp, palette pass): script over all \`**/board/terrain.json\`; **preserve \`kind\`**.

## Colors

ZSS \`COLOR\` enum 0-15. Field \`color\` is foreground; \`bg\` is background.

## Read-only player objects

\`board/objects/{pid_*}.json\` is MEMORY -> disk only. External edits/deletes do **not** change MEMORY; the file may be restored on next export.

## Sync

Cafe must stay attached (~2s debounce) for disk -> MEMORY apply. Edits must stay under \`memoryfs/\`.
`,

  'memoryfs-flags': `---
name: memoryfs-flags
description: >-
  Edit memoryfs book flag bags under books/*/flags/{owner}/stats.json. Use when
  changing owner flags, clearing a flag bag, or avoiding filtered runtime owners.
---

# memoryfs flags

## Paths

\`books/{kebab-name}-{id}/flags/{owner}/stats.json\`

- Value is a JSON \`Record\` of flag name -> value.
- Deleting the owner folder / file clears that bag in MEMORY.

## Do not mirror / invent these owners

Flag owners ending in these suffixes are filtered and never mirrored:

- \`_chip\`
- \`_tracking\`
- \`_layers\`
- \`_synth\`
- \`_gadget\`

## Book meta

- Book \`stats.json\` has id, name, token, activelist, pages[] -- **no** \`timestamp\`, **no** inline flags blob.
- Do **not** write \`timestamp\` into book \`stats.json\`.

## Sync

Cafe must stay attached (~2s debounce) for disk -> MEMORY apply. Edits must stay under \`memoryfs/\`.
`,
}

export const MEMORYFS_AGENTS_MD = `# memoryfs drop folder

This folder is a **cafe memoryfs** attach root. Live MEMORY is projected under \`memoryfs/\` as allowlisted JSON.

## Must follow

- Edit only under \`memoryfs/\` (allowlisted paths). Sibling skills here are docs, not MEMORY.
- Cafe must stay attached for disk -> MEMORY apply (~2s debounce / poll).
- Attach nuclear-clears \`memoryfs/\` then re-exports; it does **not** load a project from disk.
- Detach: \`#memoryfs detach\` (no final flush). Status: \`#memoryfs status\`.

## Tree (short)

\`\`\`text
memoryfs/
  stats.json
  books/{kebab-name}-{id}/
    stats.json
    flags/{owner}/stats.json
    pages/{kebab-name}-{id}/
      stats.json
      board/terrain.json   # 1500 cells (60x25)
      board/objects/*.json
      ...
\`\`\`

## Full skills

- Cursor: \`.cursor/skills/memoryfs/SKILL.md\` (also \`memoryfs-board\`, \`memoryfs-flags\`)
- Claude Code: \`.claude/skills/memoryfs/SKILL.md\` (same bodies)
`

/**
 * Paths relative to the drop-folder root (sibling of memoryfs/).
 * Same skill body under .cursor/skills and .claude/skills, plus AGENTS.md.
 */
export function buildmemoryfsskills(): MEMORYFS_SKILL_FILE[] {
  const files: MEMORYFS_SKILL_FILE[] = [
    { path: 'AGENTS.md', bytes: encodetext(MEMORYFS_AGENTS_MD) },
  ]
  for (let i = 0; i < MEMORYFS_SKILL_NAMES.length; ++i) {
    const name = MEMORYFS_SKILL_NAMES[i]
    const bytes = encodetext(MEMORYFS_SKILL_BODIES[name])
    files.push({
      path: `.cursor/skills/${name}/SKILL.md`,
      bytes,
    })
    files.push({
      path: `.claude/skills/${name}/SKILL.md`,
      bytes,
    })
  }
  return files
}
