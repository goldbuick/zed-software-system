# Gadget scroll catalog

The right-hand **scroll** panel shows a titled list (`scrollname` + `scroll` rows). This page lists every major code path that fills it.

**State:** [`zss/gadget/data/state.ts`](../data/state.ts) (`GADGET_STATE.scrollname`, `scroll`).

**Ways content is built:**

1. **Markdown** via [`parsemarkdownforscroll`](../../feature/parse/markdownscroll.ts) (marked → ZeText sink → [`scrollwritelines`](../data/scrollwritelines.ts)). Optional `chip` argument (default `refscroll`) is forwarded to `scrollwritelines`. Used for bundled `refscroll:*` `.md` help prose, wiki fallback, and other CommonMark bodies in [`handledefault`](../../device/vm/handlers/default.ts).
2. **Zed line blocks** via [`scrollwritelines`](../data/scrollwritelines.ts): plain lines become strings; lines with `!` and a first raw `;` become hyperlinks (`!command args;$label`). Used for built-in menus (e.g. `refscroll:menu`, zip picker, object/terrain lists).
3. Call [`scrollwritelines`](../data/scrollwritelines.ts) directly when you already have a string of tape lines (same `!` / zsstext rules); default link chip is `refscroll` unless overridden.
4. Queue lines with [`gadgettext` / `gadgethyperlink`](../data/api.ts), then assign `shared.scroll = gadgetcheckqueue(player)` (and usually set `scrollname`). Still used where panels mix imperative steps, **shared** hyperlink state (`get`/`set`), or firmware-driven queues (see admin / element scroll lock). Inspect menus use [`scrollwritelines`](../data/scrollwritelines.ts) plus [`registerhyperlinksharedbridge`](../data/api.ts) where shared widgets need `get`/`set`.

---

## Scroll builder inventory (scroll panel scope)

This subsection catalogs how the scroll panel is filled: **Category C** (centralized on [`scrollwritelines`](../data/scrollwritelines.ts)), **Category B** (hybrid), and **Category A** (fully imperative). Scope: code that sets `shared.scroll` / `shared.scrollname` on the player gadget. Related but out of this list: ROM gadget line DSL ([`zss/rom/index.ts`](../../rom/index.ts)) and firmware element scroll-lock ([`RUNTIME_FIRMWARE.aftertick`](../../firmware/runtime.ts)).

### Category C — Centralized on `scrollwritelines`

Call sites use [`scrollwritemarkdownlines`](../../feature/parse/markdownscroll.ts) (markdown → Zed lines → `scrollwritelines`) or [`scrollwritelines`](../data/scrollwritelines.ts) directly for raw Zed tape—not loops of `gadgettext`/`gadgethyperlink`. Examples include [`handlegadgetscroll`](../../device/vm/handlers/scroll.ts), [`writezztcontentwait` / `writezztcontentlinks`](../../device/vm/helpers.ts), and the **inspect** family ([`inspection.ts`](../../memory/inspection.ts), [`inspectionbatch.ts`](../../memory/inspectionbatch.ts), [`inspectionremix.ts`](../../memory/inspectionremix.ts), [`inspectionmakeit.ts`](../../memory/inspectionmakeit.ts), [`inspectionstyle.ts`](../../memory/inspectionstyle.ts), [`inspectionfind.ts`](../../memory/inspectionfind.ts)) with `registerhyperlinksharedbridge` for shared hyperlink types. See **VM handler entry points** and **`refscroll:<path>` in `handledefault`** below.

### Category B — Hybrid (imperative prefix, then `scrollwritelines`)

| Flow | Source | Pattern |
|------|--------|---------|
| Bookmarks panel | [`zss/memory/bookmarkscroll.ts`](../../memory/bookmarkscroll.ts) | `gadgethyperlink` (name + SAVE) + `gadgetbbar`, then `scrollwritelines` for URL rows. |
| Editor bookmarks | [`zss/memory/editorbookmarkscroll.ts`](../../memory/editorbookmarkscroll.ts) | `gadgethyperlink` (snapshot) + `gadgetbbar`, then `scrollwritelines` for OPEN/COPY rows. |
| List refscrolls + “back” | [`zss/device/vm/handlers/default.ts`](../../device/vm/handlers/default.ts) | `appendmainmenushortcutafterlistscroll`: one `gadgethyperlink` for main menu, then **append** `gadgetcheckqueue` tail to **existing** `shared.scroll`. |

### Category A — Fully imperative (no `scrollwritelines`)

These modules call `gadgettext` / `gadgethyperlink` in sequence and assign `shared.scroll = gadgetcheckqueue(player)` (usually with `shared.scrollname`).

| Scroll title(s) | Source | Notes |
|-----------------|--------|-------|
| `cpu #admin` | [`zss/memory/utilities.ts`](../../memory/utilities.ts) (`memoryadminmenu`) | Sections + links; `refscroll:adminscroll`. |

### Refactor roadmap (priority tiers)

- **Tier 1** — [`memoryadminmenu`](../../memory/utilities.ts) (`cpu #admin`): mostly plain lines and simple `gadgethyperlink` without custom `get`/`set`; reasonable place to prototype a tape string + one `scrollwritelines`, or `scrollwritelines` for a static body after any imperative header (same idea as bookmarks).
- **Tier 2** — [`bookmarkscroll.ts`](../../memory/bookmarkscroll.ts), [`editorbookmarkscroll.ts`](../../memory/editorbookmarkscroll.ts), [`appendmainmenushortcutafterlistscroll`](../../device/vm/handlers/default.ts): already structured, or they need **append** to existing scroll / **`gadgetbbar`**—not covered by a single plain `scrollwritelines(content)` call.
- **Tier 3** — ~~Inspect modules~~ **done:** inspect scrolls use `scrollwritelines` + `registerhyperlinksharedbridge` for shared types (`select`, `text`, `number`, edits, etc.).

**Blockers for a single `scrollwritelines`:** per-link `get`/`set` without bridges, multiple `gadgetcheckqueue` flush points, **`gadgetbbar`**, appending to an existing scroll, ROM-style layout helpers.

---

## Behavior notes

### Clearing the panel vs unlocking scroll

- [`gadgetclearscroll`](../data/api.ts) sets `scrollname` to `''` and `scroll` to `[]` for that player (local gadget state only).
- [`vmclearscroll`](../../device/api.ts) emits `vm:clearscroll`. The VM handler [`handleclearscroll`](../../device/vm/handlers/scroll.ts) walks the player’s board objects and calls [`memoryunlockscroll`](../../memory/runtime.ts) so each chip’s **scroll lock** can clear (`scrollunlock` on the element).
- The gadget server, on a client `clearscroll` message, calls **both** `gadgetclearscroll` and `vmclearscroll` so the UI empties and locks release ([`zss/device/gadgetserver.ts`](../../device/gadgetserver.ts)).

So: **`clearscroll` is not only “clear pixels”** — it also propagates unlocks. **`gadgetclearscroll` alone** only clears stored panel content.

### Scroll lock (element → player)

In [`RUNTIME_FIRMWARE.aftertick`](../../firmware/runtime.ts), when a **non-player** element’s gadget queue has **more than one** item, the runtime calls `chip.scrolllock(player)` for the focused player, then copies the queue into that player’s `scrollname` / `scroll`. While locked, the chip’s [`message`](../../chip.ts) handler ignores incoming messages from other players (`flags.sk`). Element-driven scroll stays until `vm:clearscroll` (or equivalent unlock path) runs.

### Hyperlink chips

Hyperlink rows are `[chip, label, ...args]` (see [`gadgethyperlink`](../data/api.ts)). The **chip** string is the VM/default-handler branch used when the link is activated (e.g. `refscroll`, `bookmarkscroll`, `zipfilelist`, `list`, `adminop`). Bundled refscroll help content is often markdown on disk; `registerhyperlinksharedbridge` in [`api.ts`](../data/api.ts) can supply `get`/`set` for `HYPERLINK_WITH_SHARED` types (e.g. `zipfilelist` + `select`) so generated links need no per-row closures.

### Terminal tape vs scroll (shared hyperlinks)

The bottom **tape** parses lines as `!{prefix}!{command…;$label}` (see [`TerminalItem`](../../screens/terminal/item.tsx)): a **second** `!` separates the modem key from the tokenized command. For `HYPERLINK_WITH_SHARED` widgets (`select`, `range`, `text`, edits, etc.), **`prefix` must equal `paneladdress(chip, target)`** — i.e. `chip:target` with **only the first `:`** as the separator (**`target` must not contain `:`**). [`usehyperlinksharedsync`](../data/usehyperlinksharedsync.ts) registers the same modem observe/init + bridge `get`/`set` path as `gadgethyperlink` when that prefix parses. [`registerterminalhyperlinksharedbridge`](../data/api.ts) adds tape-only defaults; merged lookup **prefers** `registerhyperlinksharedbridge` and uses the terminal registry only when the scroll bridge is missing for that `(chip, type)`.

Full wiring diagram and Q&A: [scroll-vs-terminal-hyperlinks.md](./scroll-vs-terminal-hyperlinks.md).

### Wiki fallback for `refscroll:<path>`

If `romread('refscroll:' + path)` is missing, the UI briefly shows title `$7$7$7 please wait` and loading text, then [`fetchwiki`](../../feature/fetchwiki.ts) + [`parsemarkdownforscroll`](../../feature/parse/markdownscroll.ts) fill the panel. The title becomes the **`path`** string (wiki slug).

---

## VM handler entry points

Registered in [`zss/device/vm/handlers/registry.ts`](../../device/vm/handlers/registry.ts).

| Registry key | Handler | Role |
|--------------|---------|------|
| `refscroll` | [`handlerefscroll`](../../device/vm/handlers/scroll.ts) | Loads `refscroll:menu` with title `#help or $meta+h` via [`scrollwritelines`](../data/scrollwritelines.ts). |
| `gadgetscroll` | [`handlegadgetscroll`](../../device/vm/handlers/scroll.ts) | Payload `{ scrollname, content, chip? }` → `scrollwritelines`. API: [`vmgadgetscroll`](../../device/api.ts). |
| `makeitscroll` | [`handlemakeitscroll`](../../device/vm/handlers/scroll.ts) | [`memorymakeitscroll`](../../memory/inspectionmakeit.ts) → title `makeit`. |
| `clearscroll` | [`handleclearscroll`](../../device/vm/handlers/scroll.ts) | Unlocks scroll on all objects on the player’s board; does not clear gadget state by itself (pair with `gadgetclearscroll` / gadget server flow). |
| `bookmarkscroll` | [`handlebookmarkscroll`](../../device/vm/handlers/bookmarkscroll.ts) | [`memorybookmarkscroll`](../../memory/bookmarkscroll.ts): header links + `gadgetbbar`, then [`scrollwritelines`](../../gadget/data/scrollwritelines.ts) for list rows. |
| `editorbookmarkscroll` | [`handleeditorbookmarkscroll`](../../device/vm/handlers/editorbookmarkscroll.ts) | [`memoryeditorbookmarkscroll`](../../memory/editorbookmarkscroll.ts): snapshot link + `gadgetbbar`, then `scrollwritelines` for entries. |
| `readzipfilelist` | [`handlereadzipfilelist`](../../device/vm/handlers/zipfile.ts) | Title `zipfilelist`; Zed `!` lines via `scrollwritelines`, chip `zipfilelist`. |

Panel-only actions for editor bookmarks go through [`handledefault`](../../device/vm/handlers/default.ts) as `editorbookmarkscroll:<path>` (e.g. `snapshotcurrent`, `copytogame`, `editorbookmarkdel` → prompt scroll, `editorbookmarkdelconfirm` → `register:editorbookmark:delete` and refreshed list, `editorbookmarkdelcancel` → restore list from cache).

**Tape editor close:** On [`register.ts`](../../device/register.ts) `editor:close`, the UI clears local editor state and calls [`vmtapeeditorclose`](../../device/api.ts), which emits `vm:tapeeditorclose` into the sim worker. There is no dedicated row for that target in [`vmhandlers`](../../device/vm/handlers/registry.ts); it falls through [`handledefault`](../../device/vm/handlers/default.ts) like other unmatched VM subtargets.

**`snapshotcurrent` and `useTape`:** The sim worker does not share the main-thread Zustand [`useTape`](../../gadget/data/state.ts) store. `editorbookmarkscroll:snapshotcurrent` is handled in [`handleeditorbookmarkscrollpanel`](../../device/vm/handlers/editorbookmarkscroll.ts): with a code page id in `message.data`, it loads the page via [`memoryreadcodepagebyid`](../../memory/codepages.ts) and calls [`registerbookmarkcodepagesave`](../../device/api.ts). [`registereditoropen`](../../device/api.ts) still runs before `register:editor:open` for editor UI state; closing the editor uses `editor:close` → `vmtapeeditorclose` as above.

---

## `refscroll:<path>` in `handledefault`

Special paths (not necessarily ROM filenames) in [`handledefault`](../../device/vm/handlers/default.ts) `case 'refscroll'`:

| Path | Title | Notes |
|------|-------|--------|
| `adminscroll` | `cpu #admin` | [`memoryadminmenu`](../../memory/utilities.ts). |
| `objectlistscroll` | `object list` | `!istargetless copyit …` lines + `scrollwritelines`; chip `list`. |
| `terrainlistscroll` | `terrain list` | Same; chip `list`. |
| `charscroll` | `chars` | Zed `!` line + `scrollwritelines`; chip `refscroll`. |
| `colorscroll` | `colors` | Same. |
| `bgscroll` | `bgs` | Same. |
| `notescalesscroll` | `notescalesscroll` | ROM [`notescalesscroll.md`](../../rom/refscroll/notescalesscroll.md); drill-down `notescales_*`; `parsemarkdownforscroll`; chip `refscroll` (default). |
| *(any other)* | `path` | Bundled `.md` or wiki; see below. |

**Default branch:** `romread('refscroll:' + path)`. If content exists: `parsemarkdownforscroll` on the markdown string. If not: wiki fetch + `parsemarkdownforscroll`. Final `scrollname` is `path` once content is ready.

---

## ROM keys (`refscroll/`)

Bundled under [`zss/rom/refscroll/`](../../rom/refscroll/) as **`.md`** files. Address = `refscroll:<name>` where `<name>` is the filename without `.md`.

`algoscroll`, `autofilterscroll`, `autowahscroll`, `cliscroll`, `commandsscroll`, `distortscroll`, `echoscroll`, `effectsscroll`, `fcrushscroll`, `helpcontrols`, `helpdeveloper`, `helpmenu`, `helpplayer`, `helptext`, `menu`, `notescalesscroll`, `notescales_aeolian`, `notescales_blues`, `notescales_dorian`, `notescales_exotic`, `notescales_harmonicminor_modal`, `notescales_ionian`, `notescales_jazzmodal`, `notescales_locrian`, `notescales_lydian`, `notescales_major`, `notescales_majorpent`, `notescales_melodicminor_modal`, `notescales_minorpent`, `notescales_mixolydian`, `notescales_modal`, `notescales_naturalminor`, `notescales_pentatonic`, `notescales_phrygian`, `notesscroll`, `oscscroll`, `pulsescroll`, `pwmscroll`, `reverbscroll`, `synthscroll`, `vibratoscroll`, `voicescroll`.

---

## Inspection and memory flows (`scrollname` values)

These flows are **Category A** in [Scroll builder inventory](#scroll-builder-inventory-scroll-panel-scope): they set `scrollname` while building the gadget queue; several use **shared** hyperlink `get`/`set` (config toggles, find-any text slots) and stay on the queue API until bridged like zip `select` (see source for exact entry points).

---

## Firmware and tools

| Title | Source |
|-------|--------|
| *(element `name` or `kinddata.name`)* | [`RUNTIME_FIRMWARE.aftertick`](../../firmware/runtime.ts) — non-player element, multi-line gadget queue, focused player |
| [`ZZT_BRIDGE`](../../device/vm/helpers.ts) (decorated banner) | [`writezztcontentwait` / `writezztcontentlinks`](../../device/vm/helpers.ts) → `scrollwritelines` (chip `zztbridge`) |

---

## Flow (high level)

```mermaid
flowchart LR
  subgraph vm [VM_messages]
    refscroll[refscroll]
    gadgetscroll[gadgetscroll]
    makeitscroll[makeitscroll]
    bookmarkscroll[bookmarkscroll]
    editorbm[editorbookmarkscroll]
    readzip[readzipfilelist]
  end
  subgraph default [handledefault]
    refpath[refscroll_path]
  end
  subgraph fill [Fill_gadget_panel]
    mdscroll[parsemarkdownforscroll]
    apply[scrollwritelines]
    queue[gadgettext_gadgethyperlink_checkqueue]
  end
  refscroll --> apply
  gadgetscroll --> apply
  makeitscroll --> queue
  bookmarkscroll --> apply
  editorbm --> apply
  readzip --> apply
  refpath --> romwiki[romread_or_fetchwiki_md]
  romwiki --> mdscroll
```

---

## Related

- ROM overview: [`zss/feature/docs/rom.md`](../../feature/docs/rom.md)
- Markdown → scroll: [`zss/feature/parse/markdownscroll.ts`](../../feature/parse/markdownscroll.ts)
