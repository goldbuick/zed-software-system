# grapheme.ts

**Purpose**: Unicode grapheme cluster helpers using `Intl.Segmenter`. Shared by markdown rendering and lexer/display alignment so emoji and combining characters count as one cell.

## Dependencies

- `./intl-segmenter.d.ts` — augments `Intl` for ES2022 `Segmenter` when project `lib` is below ES2022

## Exports

| Export | Description |
|--------|-------------|
| `graphemelength(source)` | Number of grapheme clusters in `source` |
| `graphemes(str)` | Generator of each grapheme cluster string |
| `codeunitoffsettocellindex(line, codeunitoffset)` | Maps a code-unit index in `line` to grapheme index (cell column) |
