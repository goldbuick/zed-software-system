# ZZT corpus lang regression fixtures

Committed samples for `ZSS ⊃ ZZT-OOP` parser hardening. Full Museum corpus output stays gitignored under `ops/fixtures/zzt/corpus/zss/`.

| Path | Role |
|------|------|
| [`raw_zzt/`](raw_zzt/) | Verbatim ZZT-OOP (`stat.code` / LANGREF shapes) — no `zztoop` |
| [`failure-report.json`](failure-report.json) | Latest `lang:zzt:corpus:analyze` summary |
| [`../zzt-ref/`](../zzt-ref/) | RoZZT LANGREF + ZSS extension rules |

## Tasks

```bash
yarn task run lang:zzt:corpus:analyze
yarn task run lang:zzt:corpus:analyze limit 50
```

Requires local `ops/fixtures/zzt/corpus/extracted/` from `content:zzt:corpus:extract`.

## Latest full-corpus snapshot (2026-06-20)

| Gate | ok / total | rate |
|------|------------|------|
| raw `stat.code` | 1,066,895 / 1,108,500 | **96.25%** |
| wrapped `.zss` | (re-run without `raw-only`) | ~96.3% prior |

Prior baseline (pre-fixable-parser work): **96.38%** (1,068,406 ok), **7,169** `fixable_fail`.

After parser fixes: **~740** fewer fixable failures (`fixable_fail` **6,429**). Top remaining fixable buckets: multiline `#change`/`#become` arg tails, lone `#` after partial `stmt_change_become`, `dir`/`dir_select` newline splits. See `failure-report.json` triage (`fixable` / `invalid_zzt` / `ambiguous`).

| Gate | ok / total | rate |
|------|------------|------|
| raw `stat.code` (latest) | 1,066,774 / 1,108,500 | **96.24%** |

```bash
yarn task run lang:zzt:corpus:analyze raw-only   # faster: skip wrapped walk
```

Tests: `ops/tests/unit/feature/lang/backend/typescript/zztcorpusparse.test.ts`, `zztlangrefsmoke.test.ts`, `zztfixableparser.test.ts`.
