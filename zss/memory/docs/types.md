# types.ts

**Purpose**: Defines BOARD, BOARD_ELEMENT, BOOK, CODE_PAGE, and related enums. Core data structures for the memory system.

## Dependencies

- `zss/gadget/data/bitmap` — BITMAP
- `zss/mapping/types` — MAYBE
- `zss/words/dir` — STR_DIR
- `zss/words/types` — CATEGORY, COLLISION, WORD

## Constants

| Name | Value |
|------|-------|
| BOARD_WIDTH | 60 |
| BOARD_HEIGHT | 25 |
| BOARD_SIZE | 1500 |
| CHAR_RAY_MARGIN | 3 |
| FIXED_DATE | 1980/09/02 |

## Enums

| Enum | Key values |
|------|------------|
| BOARD_ELEMENT_KEYS | kind, id, x, y, char, color, collision, etc. |
| BOARD_KEYS | terrain, objects, isdark, over, under, exits, etc. |
| BOOK_KEYS | id, name, timestamp, activelist, pages, flags |
| CODE_PAGE_KEYS | id, code, board, object, terrain, charset, palette |
| CODE_PAGE_TYPE | ERROR, LOADER, BOARD, OBJECT, TERRAIN, CHARSET, PALETTE |
| MEMORY_LABEL | main, temp, title, player, gadgetstore |

## Types

| Type | Description |
|------|-------------|
| BOARD | terrain, objects, lookup, named, exits, over/under, etc. |
| BOARD_ELEMENT | kind, id, x, y, char, color, code, collision, category, etc. |
| BOOK | id, name, pages, flags, activelist |
| CODE_PAGE | id, code, board/object/terrain/charset/palette, stats |
| BOOK_FLAGS | Record<string, WORD> |
