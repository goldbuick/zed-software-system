# gamesend.ts

**Purpose**: Game message dispatch — send to element, send to boards, send to elements from chip. Handles target resolution (all, self, others, named) and directional send.

## Dependencies

- `zss/chip` — CHIP, senderid
- `zss/device/api` — apichat
- `zss/device/session` — SOFTWARE
- `zss/mapping/*` — guid, 2d, types
- `zss/words/*` — dir, reader, send, types
- `./boardelement` — memoryboardelementisobject
- `./boardoperations` — memoryreadelement, memorysafedeleteelement
- `./playermanagement` — memoryreadbookplayerboards
- `./rendering` — memoryelementtologprefix
- `./runtime` — memorymessagechip
- `./spatialqueries` — memorylistboardelementsbyidnameorpts

## Exports

| Export | Description |
|--------|-------------|
| `memorysendtoboards` | Send message to elements on boards (target or PT) |
| `memorysendtoelement` | Send label from element to element (touch/shot/thud/partyshot) |
| `memorysendtoelements` | Chip sends to targetname or targetdir |
| `memorysendtolog` | apichat with element prefix |
