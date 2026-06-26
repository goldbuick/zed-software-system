# ZZT-OOP (vanilla) parser fixtures

Committed samples for the standalone `zss/feature/zztoop` parser/compiler, which
targets **vanilla ZZT 3.2** OOP as defined by [RoZZT `OOP.PAS`](https://github.com/asiekierka/reconstruction-of-zzt/blob/master/SRC/OOP.PAS)
and [`LANGREF.md`](../zzt-ref/LANGREF.md). No ZSS extensions (`#do`/`#while`,
arithmetic expressions, `#toast`) are accepted here — those live in
[`zss/feature/lang`](../../../../zss/feature/lang).

| Path | Role |
|------|------|
| [`raw/`](raw/) | Verbatim vanilla ZZT-OOP programs (no `zztoop` import transforms) |
| [`raw/101/`](raw/101/) | One example per section of [ZZT-OOP 101](https://museumofzzt.com/article/view/747/zzt-oop-101/), numbered `01..38` in article order (1:1 with its table of contents) |
| [`manifest.json`](manifest.json) | Fixture id lists (`raw`, `oop101`) consumed by the parse + emission tests |
| [`failure-report.json`](failure-report.json) | Latest `lang:zztoop:corpus:analyze` summary |

## ZZT-OOP 101 coverage

The `oop101` manifest entry holds **one fixture per section** of Dr. Dos'
[ZZT-OOP 101](https://museumofzzt.com/article/view/747/zzt-oop-101/), numbered
`01_stats_cycles_execution` .. `38_zap` in the article's own order. Each fixture
covers exactly one scenario: execution model, scrolls, syntax formatting, text /
white-centered text / hyperlinks (+ external files), comments & pre-zapped
labels, naming, labels, movement (directions + modifiers + chaining), and a
dedicated file for every `#command` (`#become`, `#bind`, `#change`, `#char`,
`#clear`, `#cycle`, `#die`, `#end`, `#endgame`, `#give`, `#go`, `#idle`, `#if`,
`#lock`, `#play`, `#put`, `#restart`, `#restore`, `#send`, `#set`, `#shoot`,
`#take`, `#throwstar`, `#try`, `#unlock`, `#walk`, `#zap`).

`zztoop101.test.ts` keeps a scenario table that is asserted 1:1 with this
manifest list (a coverage guard fails if any scenario is added/dropped without a
test). For each scenario it asserts parse-clean, compile-clean, and the expected
`api.*` lowering, plus runtime checks for the execution model (`#end` halts, one
move per tick, blocking `/` vs non-blocking `?`, `#if` guards).

Note: `$Centered text` is **not** special-cased — zztoop preserves it verbatim
as text rather than rendering ZZT's white-centered directive.

## Tasks

```bash
yarn task run lang:zztoop:corpus:analyze raw-only          # fast loop, skip wrapped walk
yarn task run lang:zztoop:corpus:analyze raw-only limit 500
yarn task run lang:zztoop:corpus:analyze full              # full corpus
```

Requires a local Museum corpus under `ops/fixtures/zzt/corpus/extracted/`
(`content:zzt:corpus:extract`).

## Tests

- `ops/tests/unit/feature/zztoop/corpusparse.test.ts` — every fixture parses clean
- `ops/tests/unit/feature/zztoop/emission.test.ts` — fixtures emit the expected `api.command` / `api.if` / move shapes
- `ops/tests/unit/feature/zztoop/zztoop101.test.ts` — ZZT-OOP 101 corpus: parse + compile + expected lowering + runtime execution model
- `ops/tests/unit/feature/zztoop/corpusgate.test.ts` — committed corpus ok-rate floor
