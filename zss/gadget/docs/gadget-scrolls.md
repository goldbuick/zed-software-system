# Gadget scroll catalog

The right-hand **scroll** panel shows a titled list (`scrollname` + `scroll` rows). This page lists every major code path that fills it.

**State:** [`zss/gadget/data/state.ts`](../data/state.ts) (`GADGET_STATE.scrollname`, `scroll`).

**Ways content is built:**

1. **Markdown** via [`parsemarkdownforscroll`](../../feature/parse/markdownscroll.ts) (marked → ZeText sink → [`scrollwritelines`](../data/scrollwritelines.ts)). Optional `chip` argument (default `refscroll`) is forwarded to `scrollwritelines`. Used for bundled `refscroll:*` `.md` help prose, wiki fallback, and other CommonMark bodies in [`handledefault`](../../device/vm/handlers/default.ts).
2. **Zed line blocks** via [`applyzedscroll`](../../feature/parse/markdownscroll.ts) (thin wrapper around [`scrollwritelines`](../data/scrollwritelines.ts)): plain lines become strings; lines with `!` and a first raw `;` become hyperlinks (`!command args;$label`). Used for built-in menus (e.g. `refscroll:menu`, zip picker, object/terrain lists).
3. Call [`scrollwritelines`](../data/scrollwritelines.ts) directly when you already have a string of tape lines (same `!` / zetext rules); default link chip is `refscroll` unless overridden.
4. Queue lines with [`gadgettext` / `gadgethyperlink`](../data/api.ts), then assign `shared.scroll = gadgetcheckqueue(player)` (and usually set `scrollname`). Still used where panels mix imperative steps, **shared** hyperlink state (`get`/`set`), or firmware-driven queues (see inspection / admin / element scroll lock).

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
| `refscroll` | [`handlerefscroll`](../../device/vm/handlers/scroll.ts) | Loads `refscroll:menu` with title `#help or $meta+h` via [`applyzedscroll`](../../feature/parse/markdownscroll.ts) → `scrollwritelines`. |
| `gadgetscroll` | [`handlegadgetscroll`](../../device/vm/handlers/scroll.ts) | Payload `{ scrollname, content, chip? }` → `scrollwritelines`. API: [`vmgadgetscroll`](../../device/api.ts). |
| `makeitscroll` | [`handlemakeitscroll`](../../device/vm/handlers/scroll.ts) | [`memorymakeitscroll`](../../memory/inspectionmakeit.ts) → title `makeit`. |
| `clearscroll` | [`handleclearscroll`](../../device/vm/handlers/scroll.ts) | Unlocks scroll on all objects on the player’s board; does not clear gadget state by itself (pair with `gadgetclearscroll` / gadget server flow). |
| `bookmarkscroll` | [`handlebookmarkscroll`](../../device/vm/handlers/bookmarkscroll.ts) | [`memorybookmarkscroll`](../../memory/bookmarkscroll.ts): header links + `gadgetbbar`, then [`scrollwritelines`](../../gadget/data/scrollwritelines.ts) for list rows. |
| `editorbookmarkscroll` | [`handleeditorbookmarkscroll`](../../device/vm/handlers/editorbookmarkscroll.ts) | [`memoryeditorbookmarkscroll`](../../memory/editorbookmarkscroll.ts): snapshot link + `gadgetbbar`, then `scrollwritelines` for entries. |
| `readzipfilelist` | [`handlereadzipfilelist`](../../device/vm/handlers/zipfile.ts) | Title `zipfilelist`; Zed `!` lines + `applyzedscroll` / `scrollwritelines`, chip `zipfilelist`. |

Panel-only actions for editor bookmarks go through [`handledefault`](../../device/vm/handlers/default.ts) as `editorbookmarkscroll:<path>` (e.g. `snapshotcurrent`, `copytogame`; successful copy may call `vmclearscroll`).

---

## `refscroll:<path>` in `handledefault`

Special paths (not necessarily ROM filenames) in [`handledefault`](../../device/vm/handlers/default.ts) `case 'refscroll'`:

| Path | Title | Notes |
|------|-------|--------|
| `adminscroll` | `cpu #admin` | [`memoryadminmenu`](../../memory/utilities.ts). |
| `objectlistscroll` | `object list` | `!istargetless copyit …` lines + `applyzedscroll`; chip `list`. |
| `terrainlistscroll` | `terrain list` | Same; chip `list`. |
| `charscroll` | `chars` | Zed `!` line + `applyzedscroll`; chip `refscroll`. |
| `colorscroll` | `colors` | Same. |
| `bgscroll` | `bgs` | Same. |
| *(any other)* | `path` | Bundled `.md` or wiki; see below. |

**Default branch:** `romread('refscroll:' + path)`. If content exists: `parsemarkdownforscroll` on the markdown string. If not: wiki fetch + `parsemarkdownforscroll`. Final `scrollname` is `path` once content is ready.

---

## ROM keys (`refscroll/`)

Bundled under [`zss/rom/refscroll/`](../../rom/refscroll/) as **`.md`** files. Address = `refscroll:<name>` where `<name>` is the filename without `.md`.

`algoscroll`, `autofilterscroll`, `autowahscroll`, `cliscroll`, `commandsscroll`, `distortscroll`, `echoscroll`, `effectsscroll`, `fcrushscroll`, `helpcontrols`, `helpdeveloper`, `helpmenu`, `helpplayer`, `helptext`, `menu`, `notesscroll`, `oscscroll`, `pulsescroll`, `pwmscroll`, `reverbscroll`, `synthscroll`, `vibratoscroll`, `voicescroll`.

---

## Inspection and memory flows (`scrollname` values)

These mostly set `scrollname` while building the gadget queue; several use **shared** hyperlink `get`/`set` (config toggles, find-any text slots) and stay on the queue API until bridged like zip `select` (see source for exact entry points):

| Title | Source (representative) |
|-------|-------------------------|
| `inspect`, `bulk set bg`, `char`, `bulk set char`, *(dynamic `name`)*, `bulk set color`, `empty` | [`zss/memory/inspection.ts`](../../memory/inspection.ts) |
| `copy`, `cut`, `paste` | [`zss/memory/inspectionbatch.ts`](../../memory/inspectionbatch.ts) |
| `remix` | [`zss/memory/inspectionremix.ts`](../../memory/inspectionremix.ts) |
| `findany` | [`zss/memory/inspectionfind.ts`](../../memory/inspectionfind.ts) |
| `makeit` | [`memorymakeitscroll`](../../memory/inspectionmakeit.ts) (also via `makeitscroll` VM message) |
| `style` | [`zss/memory/inspectionstyle.ts`](../../memory/inspectionstyle.ts) |

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
