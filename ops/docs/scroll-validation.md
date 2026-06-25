# Built-in scroll validation

Tier 1 scrolls are covered by Jest (see below). Tier 2 is manual only.

## Tier 1 — automated coverage (source of truth)

| Area | Tests / code |
|------|----------------|
| Zip file list tape + import route | `ops/tests/unit/device/vm/handlers/zipfile.handler.test.ts`, `ops/tests/unit/device/vm/handlers/default.handlers.tier1.test.ts` |
| Quoted zip `select` row shape | `ops/tests/unit/gadget/data/scrollwritelines.test.ts` (`zipfilelist quoted select target…`) |
| Refscroll submenus (`char` / `color` / `bg`, admin, object/terrain lists) | `ops/tests/unit/device/vm/handlers/default.handlers.tier1.test.ts` |
| ROM `refscroll:menu` → `handlerefscroll` | `ops/tests/unit/device/vm/handlers/scroll.refscroll.test.ts` |
| Clear / make-it / gadget scroll handlers | `ops/tests/unit/device/vm/handlers/scroll.handlers.test.ts` |

Related implementation:

- `zss/device/vm/handlers/zipfile.ts` — zip picker scroll
- `zss/device/vm/handlers/default.ts` — `refscroll:*`, `zipfilelist:*`
- `zss/device/vm/handlers/scroll.ts` — `handlerefscroll`, `handleclearscroll`, `handlemakeitscroll`, `handlegadgetscroll`

Run: `yarn app:test` (or the paths above).

## Tier 1 — manual checklist (smoke before release)

Do once per release or before a scroll-affecting merge:

1. **Help / refscroll:** Open #help or meta menu; confirm refscroll menu renders.
2. **Sub-scrolls:** From refscroll, open object list, terrain list, char, color, and bg sub-scrolls; confirm each opens without errors.
3. **ROM + ZNS docs:** Open one ROM-backed refscroll page; publish optional overrides to `docs.at.zed.cafe` via `POST /api/set` after `#zns` login.
4. **Bookmarks:** Open terminal and editor bookmark scrolls; exercise a hotkey link and a delete link.
5. **Zip import:** Upload a small zip with ASCII names, one entry with a **space in the filename**, and (if possible) **`;` in the name**. Toggle YES on at least one file, use **import selected**, and note that import triggers delayed logout (see `parsezipfilelist` in `zss/feature/parse/file.ts`).

## Tier 2 — spot-check only (no scripted automation)

Pick one or two flows that matter for your session, for example:

- Inspect an object and open any inspection-driven scroll.
- Make-it or batch paths that open a scroll from board state.

Record pass/fail informally; expand Tier 1 tests only if a regression repeats.
