---
name: book-content
description: >-
  Author zed.cafe importable books as JSON codepage files plus manifest.
  Use when creating example worlds, demo content, or .book.json files for drag-drop import.
---

# zed.cafe book content (JSON codepages)

## When to use

- Creating example worlds or demo content for zed.cafe
- Generating `.book.json` files for drag-drop import
- Authoring individual codepages as `{name}.{type}.json`

**Not for:** standalone `.zss` files — ZSS lives in the `code` field inside each page JSON.

## Workflow

1. Create a folder under `content/` with `manifest.json` and `pages/*.json`.
2. Run `yarn content:book:build content/<yourbook>`.
3. Validate: `yarn content:book:validate content/dist/<name>.book.json`.
4. Drag `content/dist/<name>.book.json` into zed.cafe.

Validate a single page: `yarn content:codepage:validate content/.../pages/player.object.json`.

## Folder layout

```
content/mygame/
  manifest.json
  pages/
    player.object.json
    solid.terrain.json
    title.board.json
```

`manifest.json`:

```json
{
  "name": "mygame",
  "pages": [
    "pages/player.object.json",
    "pages/solid.terrain.json",
    "pages/title.board.json"
  ]
}
```

## Page JSON format

Each file is `{name}.{type}.json` where `type` is `board`, `object`, `terrain`, `charset`, `palette`, or `loader`.

**Omit `id`** — the build script assigns `sid_*` values.

```json
{
  "code": "@object player\n@char 2\n@color white\n:think\n?inputmove\n#think\n"
}
```

| Field | When |
|-------|------|
| `code` | Always required — ZSS source; first `@stat` line sets page type |
| `board` | Board pages — terrain grid, objects, exits, `startx`/`starty` inline |
| `object` | Optional on object pages — stats; hydrated from `code` if omitted |
| `terrain` | Optional on terrain pages — hydrated from `code` if omitted |

Board size: 60×25 ([`zss/memory/types.ts`](../../../zss/memory/types.ts)).

## Required pages for a playable book

- `@object player` → `player.object.json`
- `@board title` with `@startx` / `@starty` → `title.board.json`
- At least one `@terrain` kind used on the board → e.g. `solid.terrain.json`

Templates: [`content/templates/minimal`](../../../content/templates/minimal), [`content/templates/demo`](../../../content/templates/demo).

## ZSS inside `code`

- Page types: `@board name`, `@object name`, `@terrain name`, `@charset`, `@palette`
- Commands and stats: [`zss/firmware/docs/commands.md`](../../../zss/firmware/docs/commands.md), [`zss/rom/editor/stats/`](../../../zss/rom/editor/stats/)
- `#play` / `#bgplay` strings: use the [play-notation](../play-notation/SKILL.md) skill

## Import formats

**Book** (output of build): `{ "exported": "mygame.book.json", "data": { ... } }`

**Single page** (`#pageexport` or `--pages-out`): same envelope; drop into an open zed.cafe session.

## Do not

- Hand-write full 72k-line book JSON — copy structure from templates instead
- Use standalone `.zss` page files in `content/` — use JSON codepages
- Guess `sid_*` ids — omit `id` and let the build script assign them
