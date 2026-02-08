# guid.ts

**Purpose**: ID generation — session IDs, player IDs, topic IDs, human-readable names. Uses nanoid and human-id.

## Dependencies

- `alea` — Seeded RNG
- `human-id` — Human-readable IDs
- `nanoid` — Short IDs
- `nanoid-dictionary` — lowercase, numbers
- `./types` — MAYBE

## Exports

| Export | Description |
|--------|-------------|
| `createsid()` | `sid_` + nanoid(12) with `.` for `-` |
| `issid(id)` | True if starts with `sid_` |
| `createpid()` | `pid_` + 4 numbers + 16 alphanumeric |
| `ispid(id)` | True if starts with `pid_` |
| `createtopic()` | nanoid() |
| `createnameid()` | Human ID (adjective + noun) |
| `createshortnameid()` | Human ID (noun only) |
| `createinfohash(source)` | 20-char deterministic hash from string |
