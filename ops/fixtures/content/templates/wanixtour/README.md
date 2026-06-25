# wanixtour

Boards-only content book for the Wanix feature tour.

## Prerequisites

Import backing element pages first — use
[`ops/fixtures/books/example-coolregionsbow.book.json`](../../books/example-coolregionsbow.book.json)
for `player`, `solid`, `fake`, and `water` terrain definitions.

Then drop `ops/fixtures/content/dist/wanixtour.book.json` and CLI to a board
(e.g. `#go Start Here`).

## Build

```bash
yarn task run content:book:build ops/fixtures/content/templates/wanixtour
```

Do not run `content:book:validate` on this book — it is boards-only (no
`@object player` or `@board title`).

## Regenerate board pages

After editing copy in `gen-boards.mjs`:

```bash
node ops/fixtures/content/templates/wanixtour/gen-boards.mjs
```

Board terrain uses `kind: "fake"` with per-cell `char` overrides for text, a
coolregionsbow-style fake floor dither (`char` 178, colors 1/8), accent tiles,
and seeded random `kind: "water"` pools (see `boardtext.mjs`).
