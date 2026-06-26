# ZZT-OOP reference (RoZZT)

Canonical ZZT 3.2 OOP semantics from [The Reconstruction of ZZT](https://github.com/asiekierka/reconstruction-of-zzt) (MIT). ZSS treats this as the **baseline language**; ZSS-only extensions are documented in [`zzt-vs-zss.md`](zzt-vs-zss.md).

| File | Purpose |
|------|---------|
| [`LANGREF.md`](LANGREF.md) | LANGREF.HLP converted to Markdown |
| [`commands.json`](commands.json) | ZZT command list + ZSS extensions + codepage stat keywords |
| [`zzt-vs-zss.md`](zzt-vs-zss.md) | ZSS superset rules and disambiguation |

Regression fixtures derived from the Museum corpus live in [`../zzt/`](../zzt/).

## Secondary references

Corroborating, human-readable docs (use alongside `OOP.PAS`):

- [Wiki of ZZT — ZZT-OOP](https://wiki.zzt.org/wiki/ZZT-OOP), [Movement](https://wiki.zzt.org/wiki/Movement), [Direction modifiers](https://wiki.zzt.org/wiki/Direction_modifiers).
- [Museum of ZZT — ZZT-OOP 101](https://museumofzzt.com/article/view/747/zzt-oop-101/) (modern single-page command reference) and [Learning ZZT-OOP By Example With Examplia](https://museumofzzt.com/article/view/756/learning-zzt-oop-by-example-with-examplia/).

## OOP.PAS → `zss/feature/zztoop` mapping

[`zss/feature/zztoop`](../../../../zss/feature/zztoop) is a standalone vanilla
ZZT 3.2 parser/compiler, spec-driven by [RoZZT `OOP.PAS`](https://github.com/asiekierka/reconstruction-of-zzt/blob/master/SRC/OOP.PAS).
It emits the shared `CodeNode` AST and reuses the lang `transformast` +
`generator`, so compiled objects run on the existing ZSS runtime. It is distinct
from [`zss/feature/lang`](../../../../zss/feature/lang), which remains the ZSS
superset (`#do`/`#while`, arithmetic `expr_*`, `#toast`, codepage `@` headers).

The lexer runs two modes that mirror `OopExecute`: a line-classification mode
and a `cmd` word-stream mode entered after `#`, `/`, or `?` (the `OopReadWord`
argument reader).

### Line classification (`OopExecute` first-character dispatch)

| OOP.PAS first char | `zztoop` token / rule | Emission (`CodeNode`) |
|--------------------|-----------------------|------------------------|
| `@` (scroll title) | `stat` → `stat_line` | `NODE.STAT` |
| `:` (label) | `label` → `label_line` | `NODE.LABEL` active |
| `'` (comment) | `comment` → `comment_line` | `NODE.LABEL` inactive |
| `!message;text` | `hyperlink` → `hyperlink_line` | `NODE.HYPERLINK` |
| `/` (blocking move) | `divide` → `move_line` | `NODE.MOVE` `wait: true` |
| `?` (free move) | `query` → `move_line` | `NODE.MOVE` `wait: false` |
| `#` (command) | `command` → `command_line` | see below |
| anything else | `text` → `text_line` | `NODE.TEXT` |

### `ReadCommand` (the `#` word stream)

| OOP.PAS construct | `zztoop` handling | Emission |
|-------------------|-------------------|----------|
| `#word args…` | `command_line` argruns; first word is the command | `NODE.COMMAND` → `api.command(word, …)` |
| lone `#` (`Length(OopWord)=0`) | `command_line` with no argruns | no-op (skipped) |
| `#if cond [THEN] cmd` | `buildif` reads condition, optional `THEN`, consequent | `NODE.IF` (`api.if(cond…)` guarded branch) |
| `OopCheckCondition` `not` / `blocked dir` / `any tile` / `aligned` / `contact` / `energized` / flag | `readcondition` consumes the matching word count | condition words as literals to `api.if` |
| `#play …` (`OopReadLineToEnd`) | opaque rest-of-line tail | `api.command('play', tail)` |
| `OopReadWord` words crossing whitespace | argruns separated by the `cmd`-mode whitespace token | string / number literals |

Conditions and tiles are emitted as plain literals; the firmware command
handlers and `api.if` resolve directions, colors, elements, and condition
keywords at runtime, exactly as OOP.PAS defers them to its handlers.

### Movement shorthand chaining (`move_line`)

In `OopExecute` a `/`/`?` move sets `stopRunning` and resumes at the next char,
so multiple shorthand moves — and a trailing `#command` — stack on one line and
run as successive instructions. `OopReadWord` terminates each direction at the
next `/`, `?`, or `#`. `move_line` lowers each delimiter to its own statement:
`/` → `NODE.MOVE` `wait:true` (#go), `?` → `wait:false` (#try), inline `#` →
the command via `buildcommand`.

Per [ZZT-OOP 101](https://museumofzzt.com/article/view/747/zzt-oop-101/),
`/S/S/S?E?E/I/I#SHOOT SEEK` on one line moves south three times, tries east
twice, idles twice, then shoots toward the player — the canonical case the
`zztoop` parser now reproduces.

### Validation

`yarn task run lang:zztoop:corpus:analyze raw-only full` writes
[`../zztoop/failure-report.json`](../zztoop/failure-report.json). The committed
report and its CI floor live alongside the unit tests in
`ops/tests/unit/feature/zztoop/`.
