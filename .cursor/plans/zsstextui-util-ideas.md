# zsstextui additional utils (plan)

## Context

- **[zsstextui.ts](zss/feature/zsstextui.ts)** — Pure zsstext line strings (bars, headers, sections, `zsszedlinkline`, `zsstexttape`).
- **[terminalwritelines.ts](zss/feature/terminalwritelines.ts)** / **[scrollwritelines.ts](zss/gadget/data/scrollwritelines.ts)** — Newline tape sinks.

## Planned additions (from earlier iteration)

1. **Colocate `zsszedlinklinechip`** with `zsszedlinkline` in zsstextui (optional re-export from scrollwritelines).
2. **`iszedlinkline(line)`** — Shared predicate for `!…;…` rows after trim; use in both writelines loops.
3. **Optional:** `zsszedlinklines(rows)`, `zssboxinnerwidth(title)`.
4. **Optional:** Whether `scrolllinksplittokens` / parse helpers live in zsstextui vs gadget layer.

## Styled ASCII table (new)

Add a **pure** helper that returns **one string per output line** (same shape as `zssheaderlines`), so callers can `zsstexttape(tablelines, …)` or loop `write` / `gadgettext` per line.

### Behavior (draft API)

- **Name (follow project naming):** e.g. `zsstexttablelines` (or similar `lowercaseoneword`).
- **Inputs:** column headers (optional), `rows: string[][]`, optional options object.
- **Layout:** Classic box-drawing table: top rule, header row with `|`, separator, body rows, bottom rule (or minimal variant: header + `---` divider only).
- **Styling:** Reuse zsstextui visual language — same edge color as bars (`COLOR_EDGE` / `$dkpurple`), header text e.g. `$white`, body `$gray` or unstyled per cell as needed so it matches CLI/scroll menus.

### Design constraints

- **Display width vs string length:** Zsstext embeds codes like `$white` that do not count as visible characters in the terminal. For v1, either:
  - **(A)** Document that cell strings should be **plain text** for correct column alignment, with optional **prefix/suffix** color applied per column by the helper; or
  - **(B)** Add a small internal (or shared) **visible-width** helper that strips `$…` tokens when measuring/padding — only if a robust pattern exists in-repo or we define one narrowly for this util.
- **Multiline cells:** Disallow or take only first line in v1 to keep column math simple.
- **Output:** `string[]` — no I/O; composes with `zsstexttape` and writelines.

### Tests

- Unit tests in [zss/feature/__tests__/zsstextui.test.ts](zss/feature/__tests__/zsstextui.test.ts): fixed small grid, optional header-less table, empty table edge case.

### Todos

- [ ] Implement `zsstexttablelines` (name TBD) with documented width rules (plain vs stripped).
- [ ] Wire tests; optionally use from one CLI command as a dogfood example (only if a natural fit).
