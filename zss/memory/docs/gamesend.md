---
title: gamesend.ts
---

**Purpose**: Game message dispatch — send to element, send to boards, send to elements from chip. Handles target resolution (all, self, others, named) and directional send.

## Damage protocol (`:shot` / `:partyshot`)

`:shot` is the damaging hit. Prefer `#send … shot` over spawning a point-blank bullet with `#shoot` for contact damage.

Bullet collision labels come from `memorybulletcollisionlabel` (RoZZT `P1` ownership mapped to cafe `bullet.party`):

| Bullet source (`party`) | Target | Label |
|-------------------------|--------|-------|
| Player (`ispid(party)`) | creature / object / scroll / breakable wall | `:shot` |
| Player | other player | `:shot` then remap → `:partyshot` |
| Object / creature (`sid_…`) | player | `:shot` |
| Object / creature | `object` / `scroll` | `:shot` |
| Object / creature | breakable (`@isbreakable`) | `:shot` (+ softdelete) |
| Object / creature | built-in enemy without breakable | `:partyshot` (no kill; RoZZT no `BoardAttack`) |

## Contact protocol (`:touch` / `:partytouch`)

Player-initiated blocked walks send `:touch`. Same-party contact remaps like `:shot` → `:partyshot`:

| Contact | Label |
|---------|-------|
| Player walks into object / different party | `:touch` |
| Same-party contact (neither side `object` / `scroll` kind) | `:touch` remapped → `:partytouch` |

| Path | Behavior |
|------|----------|
| Bullet collision | Both directions (bullet→walker and walker→bullet) use `memorybulletcollisionlabel` via board movement; walk `:thud` via element everytick |
| `#send at x y shot` / `#send within N i shot` | Chip directional send |
| Breakable + real `:shot` | `memorysendtoelement` softdeletes the target (object or terrain) |
| `:partyshot` | No auto-delete; multiplayer friendly fire **or** enemy-source vs creature |
| `:partytouch` | Same-party friendly contact; no damage / no softdelete |

**Dual-layer directional `:shot`:** when `#send` targets a cell with label `shot`, both the object (if any) and the terrain (if any) at that PT receive `:shot`. Other labels still use a single `memoryreadelement` (object preferred, else terrain).

Canonical forms:

```text
#send at senderx sendery shot
#send within 5 i shot
#send at p5 p6 shot
```

## Dependencies

- `zss/chip` — CHIP, senderid
- `zss/device/session` — SOFTWARE
- `zss/mapping/*` — guid, 2d, types
- `zss/words/*` — dir, reader, send, types
- `./boardaccess` — memorylistelement (ids / name resolve), memoryreadelement
- `./boardelement` — memoryboardelementisobject
- `./boardlifecycle` — memorysafedeleteelement
- `./playermanagement` — memoryreadbookplayerboards
- `./runtime` — memorymessagechip

## Exports

| Export | Description |
|--------|-------------|
| `memorysendtoboards` | Send message to elements on boards (target or PT) |
| `memorysendtoelement` | Send label from element to element (touch/partytouch/shot/thud/partyshot); breakable+shot softdelete |
| `memorysendtoelements` | Chip sends to targetname or targetdir (shot hits both layers) |
| `memorybulletcollisionlabel` | RoZZT-style `shot` vs `partyshot` for ISBULLET hits |
