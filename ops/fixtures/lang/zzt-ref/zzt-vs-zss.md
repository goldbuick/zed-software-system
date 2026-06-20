# ZZT-OOP vs ZSS extensions

**ZSS ⊃ ZZT-OOP.** Valid vanilla ZZT 3.2 programs (per LANGREF) must parse in `zss/feature/lang` without import transforms (`zztoop`, reserved-word escaping, label lowercasing).

## Line kinds (ZZT baseline)

| Symbol | ZZT meaning | ZSS lexer rule |
|--------|-------------|----------------|
| `@name` | Object name on **program line 1**; later `@` lines in scrolls are **text** | `@` is `stat` on line 1, or consecutive header `@keywords` at file start; otherwise **text** |
| `#cmd` | Command at **first non-whitespace** column of the line | `#` is `command` only when `#` is the first non-ws character on the line |
| `/dir` `?dir` | Go / try direction | Unchanged |
| `:label` | Message handler | Unchanged |
| `'comment` | Comment (deactivated label) | Unchanged |
| `!btn;msg` | Hyperlink button | Unchanged |
| plain text | Scroll / message display | Whole line to EOL, including embedded `#` and `@` |

## ZSS-only syntax (additive)

- **Structured control flow:** `#if` … `#do` … `#done`, `#else`, `#while`, `#repeat`, `#waitfor`, `#foreach`, `#break`, `#continue`
- **Codepage headers:** `@object`, `@lion`, `@cycle`, `@color`, … (see `commands.json` → `zss_stat_keywords`)
- **Formatting:** `$CENTER` (ZZT used `$` prefix for centered scroll lines)
- **Extra commands:** `#toast`, `#ticker`, …

## Keyword collision

ZZT may use labels like `:do` or scroll text mentioning `while`. ZSS extension commands (`#do`, `#while`, …) lex only as `(?<=#)keyword` — the `#` character must immediately precede the extension word. `#send done`, `#give`, and `#try` use the generic command path.

ZZT forms that must keep working:

- `:do` label, `'do` comment, `#send do`, prose lines containing those words
- `#if flag then label` (ZZT inline send — no `#do` block required)

## Import pipeline (`zztoop`)

Museum corpus extraction may run `zztoop` for `$` → `$CENTER`, label lowercasing, and optional `_` escaping. That is **not** the compatibility contract — fixes belong in `lang/`.

## WASM lexer

TS oracle implements ZZT line rules first. C++ WASM lexer sync is a follow-up once `ops/fixtures/lang/zzt/` fixtures are stable.
