# network.ts

**Purpose**: Defines `NETWORK_FIRMWARE` — commands for HTTP requests. Provides `#fetch` and `#fetchwith` to perform GET or POST requests and handle responses via callbacks.

## Dependencies

- `zss/device/api` — bridgefetch
- `zss/device/session` — SOFTWARE
- `zss/words/*` — argument parsing, type guards (isstrcategory, isstrcollision, isstrcolor, isstrdir)

## Commands

| Command | Args | Description |
|---------|------|-------------|
| `fetch` | `label` `url` [, method] [args…] | Make HTTP request; `label` is callback target; `method` defaults to `get` |
| `fetchwith` | `arg` `label` `url` [, method] [args…] | Same as fetch but passes `arg` to callback |

## Supported Methods

- **get** — GET request
- **post:json** — POST with JSON body

## fetchcommand Internal

- Gathers remaining args; if an arg is an array (and not a special type like dir/category/color), it is spread into the values array
- Calls `bridgefetch` with SOFTWARE, elementfocus, arg, label, url, method, values

## Usage Example

```
#fetch onresponse https://api.example.com/data get
#fetchwith myarg onresponse https://api.example.com/submit post:json x 1 y 2
```

The `label` is used to route the response to a handler (e.g., a codepage or send target).
