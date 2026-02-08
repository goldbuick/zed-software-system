# loaderjson.ts

**Purpose**: Implements `loaderjson` — a `FIRMWARE_COMMAND` that queries JSON with JMESPath and stores the result in a stat. Used by `#readjson` in loader context.

## Dependencies

- `@metrichor/jmespath` — search
- `zss/device/api` — JSON_READER
- `zss/firmware` — FIRMWARE_COMMAND type
- `zss/memory/loader` — memoryloadercontent

## Usage

`#readjson <jmespath_filter> <name>`

- **filter** — JMESPath expression (e.g., `items[0].name`, `people[*].id`)
- **name** — Stat to store the result

## Example

```
#readjson title mytitle
#readjson items[0].price firstprice
#readjson users[*].name usernames
```

See [JMESPath spec](https://jmespath.org/) for query syntax.

## Implementation

- Gets `JSON_READER` from `memoryloadercontent(chip.id())`
- Returns 0 if reader is missing
- `search(jsonreader.json, filter)` returns the matched value
- Result is stored via `chip.set(name, result)`
