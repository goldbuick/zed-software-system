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
| raw `stat.code` | 1,068,406 / 1,108,500 | **96.38%** |
| wrapped `.zss` | (re-run without `raw-only`) | ~96.3% prior |

Target is ≥99% on raw OOP. Top remaining buckets: `##loop` labels in play expr, `:poured` in dir context, redundant single-letter tokens from corrupt/truncated OOP, mid-scroll `!` edge cases. See `failure-report.json` triage (`fixable` / `invalid_zzt` / `ambiguous`).

```bash
yarn task run lang:zzt:corpus:analyze raw-only   # faster: skip wrapped walk
```

Tests: `ops/tests/unit/feature/lang/backend/typescript/__tests__/zztcorpusparse.test.ts`, `zztlangrefsmoke.test.ts`.
