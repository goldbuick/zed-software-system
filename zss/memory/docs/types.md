---
title: types.ts
---

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
| BOARD_ELEMENT_KEYS | kind, id, x, y, char, color, collision, etc. (persisted wire keys) |
| BOARD_KEYS | terrain, objects, isdark, over, under, exits, etc. (persisted wire keys) |
| BOOK_KEYS | id, name, timestamp, activelist, pages, flags |
| CODE_PAGE_KEYS | id, code, board, object, terrain, charset, palette |
| CODE_PAGE_TYPE | ERROR, LOADER, BOARD, OBJECT, TERRAIN, CHARSET, PALETTE, TXT |
| MEMORY_LABEL | title, player |

## Types

| Type | Description |
|------|-------------|
| BOARD | terrain, objects, exits, over/under, plus runtime-only `named`, `distmaps`, draw*, mediaqueue* |
| BOARD_ELEMENT | kind, id, x, y, char, color, code, collision, plus runtime-only `category`, `kinddata`, `kindsource*`, `pushedtick` |
| BOOK | id, name, pages, `flags: Record<string, BOOK_FLAGS>` (inline bags), activelist |
| CODE_PAGE | id, code, optional inline `board` / `object` / `terrain` / `charset` / `palette`, stats |
| BOOK_FLAGS | `Record<string, WORD>` — one owner's flag bag |

First-line `@` rule: `@{type}` alone names an object; `@{type} <name>` declares that codepage type (including `txt`).
