# Book content examples

## Minimal playable book (3 pages)

### `pages/player.object.json`

```json
{
  "code": "@player\n@ispushable\n@cycle 1\n@char 2\n@color white\n@bg blue\n:think\n?inputmove\n#idle\n#think\n"
}
```

### `pages/solid.terrain.json`

```json
{
  "code": "@terrain solid\n@issolid\n@char 219"
}
```

### `pages/title.board.json`

```json
{
  "code": "@board title\n@startx 30\n@starty 11",
  "board": {
    "name": "title",
    "terrain": [],
    "objects": {},
    "startx": 30,
    "starty": 11
  }
}
```

## Board with wall border

Put terrain tiles inline on the board page (`kind` must match a terrain page name):

```json
{
  "code": "@board title\n@startx 30\n@starty 11",
  "board": {
    "name": "title",
    "startx": 30,
    "starty": 11,
    "terrain": [
      { "kind": "solid", "x": 0, "y": 0 },
      { "kind": "solid", "x": 1, "y": 0 }
    ],
    "objects": {}
  }
}
```

For a full perimeter, repeat for x=0..59, y=0 and y=24, then x=0 and x=59 for y=1..23. See `content/templates/demo/pages/title.board.json`.

## Interactive object

### `pages/gem.object.json`

```json
{
  "code": "@gem\n@isitem\n@char 4\n@color yellow\n:touch\n#ticker You found a gem!\n#die\n"
}
```

Place an instance on the board:

```json
"objects": {
  "gem1": {
    "id": "gem1",
    "name": "gem",
    "kind": "gem",
    "x": 30,
    "y": 12
  }
}
```

## Multi-room manifest

Add more board pages and wire exits via `@exitnorth room2` in `code` (or `"exitnorth": "room2"` in `board`):

```json
{
  "name": "tworooms",
  "pages": [
    "pages/player.object.json",
    "pages/solid.terrain.json",
    "pages/room1.board.json",
    "pages/room2.board.json"
  ]
}
```

Reference fixtures: `zss/feature/lang/backend/wasm/__tests__/fixtures/coolregionsbow/*.zss` for ZSS patterns to embed in `code` strings.
