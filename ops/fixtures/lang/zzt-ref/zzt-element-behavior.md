# ZZT element behavior vs zed cafe (coolregionsbow)

Implementation reference for fixing the cafe element library so each kind matches ZZT 3.2. **Fidelity target: match ZZT 3.2 behavior, but keep intentional cafe deviations where they exist and flag them** -- numeric divergences (e.g. bomb fuse cycle, energizer duration) are called out as deviations, not mandatory rewrites.

- **ZZT truth:** [Reconstruction of ZZT](https://github.com/asiekierka/reconstruction-of-zzt) -- [`SRC/ELEMENTS.PAS`](https://github.com/asiekierka/reconstruction-of-zzt/blob/master/SRC/ELEMENTS.PAS) (procs + `InitElementDefs`) and [`SRC/GAMEVARS.PAS`](https://github.com/asiekierka/reconstruction-of-zzt/blob/master/SRC/GAMEVARS.PAS) (`E_*` ids, `TElementDef`, `TStat`).
- **Source of truth to fix (canonical element library):** the coolregionsbow book at [`ops/fixtures/books/example-coolregionsbow.book.json`](../../books/example-coolregionsbow.book.json), loaded via [`ops/lib/coolregionsbowbook.ts`](../../../lib/coolregionsbowbook.ts) (`loadcoolregionsbowelementlibrary`). Fix the element codepages here.
- **Inspection snapshot:** the workspace export `darkpianoshammer` / `sid_vuYEPNKWWAPd` (`/Users/goldbuick/Development/zed-workspace/darkpianoshammer-sid_vuYEPNKWWAPd`, `<kind>-sid_<id>/{object|terrain}/element.json`) is an instance of that library and is what the code excerpts below were read from -- edit the book source, not this export.
- **ZSS command surface:** [`zss/firmware/docs/element.md`](../../../../zss/firmware/docs/element.md). ID <-> kind import map: [`zss/feature/parse/zzt.ts`](../../../../zss/feature/parse/zzt.ts).

## ZZT tick model mapped to ZSS

| ZZT concept | Where | ZSS equivalent |
|-------------|-------|----------------|
| `TickProc(statId)` -- runs each cycle | `ElementDefs[e].TickProc` | `:think` loop (`#idle`/`#go` then `#think`) |
| `TouchProc(x,y,src,dx,dy)` -- player walks into it | `ElementDefs[e].TouchProc` | `:touch` label |
| `DrawProc(x,y,ch)` -- animated glyph | `ElementDefs[e].DrawProc` | `:drawdisplay` label (see below), not `#char` in `:think` |
| `Cycle` (lower = faster; `-1` = no tick/stat) | `TElementDef.Cycle` | `@cycle N` |
| `Stat.P1/P2/P3` | `TStat` | `p1`/`p2`/`p3` |
| `Stat.StepX/StepY` | `TStat` | `stepx`/`stepy` (`#walk`, `?dir`) |
| `BoardAttack` -- contact damage to player | `Game.pas` | melee idiom: `#shoot at senderx sendery` toward the player on `:thud`, then `#die` on `:shot` |
| `BoardShoot` -- spawn bullet/star | `Game.pas` | `#shoot dir` / `#shoot dir star` |
| `DamageStat` / `BoardDamageTile` | `Game.pas` | `:shot` / `:bombed` -> `#die` |
| `OopSend(-stat,'SHOT')` from a bullet hit | bullet tick | target `:shot` label |

Contact damage (`BoardAttack`) mapping: the engine only auto-sends `:touch` (to both parties) when a creature bumps the player -- `:shot` is delivered by bullets. **In cafe, a creature's melee is represented by `#shoot at senderx sendery` on `:thud`** (a point-blank shot toward the player that lands as a `:shot` on the player). This is the intended idiom, so the `#shoot`-on-thud pattern in lion/tiger/bear/ruffian is correct and should be kept -- not converted to a separate melee command. Real creature bugs are about *movement/AI* (water gating, centipede chains, missing kinds), not the melee representation.

## Animated glyphs: use `:drawdisplay`, not `:think`

ZZT `DrawProc` is a **render-time** hook: it recomputes an element's glyph every frame from `CurrentTick` and neighbors, separately from gameplay. The zss equivalent is the `:drawdisplay` label, not per-tick `#char` inside `:think`.

How it works (see [`zss/memory/boardtick.ts`](../../../../zss/memory/boardtick.ts) and [`zss/memory/boarddrawdirty.ts`](../../../../zss/memory/boarddrawdirty.ts)):

- Each board tick builds two passes. The **draw pass** runs only the `:drawdisplay` label (dispatched with `label: 'drawdisplay'`); an element is included only if its code defines that label (`memorycodehasdrawdisplay`, compiled + cached). The draw pass is resolved **before** the tick/`:think` pass each frame.
- **Terrain participates.** Terrain never `:think`s, but terrain with `:drawdisplay` still redraws -- this is the correct home for wall-glyph logic (e.g. `line`).
- **Incremental + neighbor-aware.** `memoryupdatedrawdirty` fingerprints each element (x, y, char, color, bg, `display*`, light, code, ...); changed cells seed an **8-neighbor** expansion into a `drawallowids` set, and only those ids re-run `:drawdisplay` next frame. So a neighbor-dependent glyph (line connectors, blink rays) recomputes automatically when an adjacent cell changes -- no manual `#send` fan-out needed.
- For non-local visual changes fingerprints can't see, call `memoryinvalidatedraw(board)` to force a full redraw.

Implications for the elements below:

- Put animated/derived glyphs in `:drawdisplay` (ending `#end`): star `/-|\` spin + rainbow, duplicator `250/249/248/o/O` phase, transporter `( < (` / `^ ~ ^`, spinning gun `24/26/25/27`, bomb `48+P1` countdown, conveyor `| / - \`.
- Set `char`/`color` (or `displaychar`/`displaycolor`/`displaybg`) there; keep `:think` for movement/AI only.
- The current cafe `line` uses a `:calcdisplay` label pushed via `#send n/s/w/e` -- prefer a `:drawdisplay` label and let the 8-neighbor dirty expansion drive reconnection. Same for `blinkwall`/`clockwise`/`counter` glyph work now living in `:think`.

## ZSS stat and flag reference

Vocabulary these elements rely on. Full command surface: [`zss/firmware/docs/element.md`](../../../../zss/firmware/docs/element.md); collision names: [`zss/words/collision.ts`](../../../../zss/words/collision.ts).

### World stats (player-scoped, ZZT `World.Info`)

In cafe these are **player flags by convention** (set/read with `#give`/`#take`/`#set`/`#clear`), not engine-tracked -- except `health`, which the element firmware special-cases (player is logged out when `health <= 0`, see [`zss/firmware/element.ts`](../../../../zss/firmware/element.ts)). Elements mutate them on the touching player via `#give`/`#take`.

| Stat | Set by | ZZT source |
|------|--------|------------|
| `health` | gem +1, damage `:shot`; engine ends run at `<= 0` | `World.Info.Health` |
| `ammo` | ammo +5; shooting -1 | `World.Info.Ammo` |
| `gems` | gem +1 | `World.Info.Gems` |
| `torches` | torch +1; lighting -1 | `World.Info.Torches` |
| `score` | gem +10, kills (`ScoreValue`) | `World.Info.Score` |
| `key<color>` (cafe: `key0`,`key9`..`key15`) | key grants, door consumes | `World.Info.Keys[1..7]` |
| `energized` / `wick` (cafe) | energizer / torch upkeep timers | `EnergizerTicks` / `TorchTicks` |

### Element stats (engine, per-element)

`char`, `color`, `bg`, `displaychar`/`displaycolor`/`displaybg`, `displayname`, `cycle`, `stepx`/`stepy`, `shootx`/`shooty`, `p1`..`p10`, `light`, `lightdir`, `group`, `party`, `item`, `pushable`, `breakable`, `collision`, `player`, `arg`. Map ZZT `P1/P2/P3` -> `p1/p2/p3` and `StepX/StepY` -> `stepx/stepy`.

### Collision flags (kind headers)

| Header | Collision | Meaning |
|--------|-----------|---------|
| `@issolid` | `ISSOLID` | blocks movement (walls) |
| `@iswalk` / `@iswalkable` | `ISWALK` | walkable (empty, fake) |
| `@isswim` / `@isswimming` / `@isswimmable` | `ISSWIM` | water-traversal (shark), bullets pass |
| `@isbullet` | `ISBULLET` | projectile; delivers `:shot`, cannot push |
| `@isghost` | `ISGHOST` | passes over everything (bombsmoke) |

Also common as kind headers: `@isitem` (grabbable, triggers `:touch`), `@ispushable [dirs]` (pushable, optional axis list like `n s`), `@isbreakable` / `@notbreakable`.

### Labels and movement idioms

- **Labels:** `:think` (tick loop), `:touch` (walked into), `:thud` (movement blocked), `:shot` (hit by bullet), `:bombed` (bomb blast), `:bump`, `:drawdisplay` (render pass).
- **Direction words (`?dir` / `#walk`):** `rnd`, `seek`, `flow`, `cw`, `ccw`, `at <x> <y>`, plus `n/s/e/w`.
- **Move/act:** `#go <dir>` (move+yield), `#walk <dir>` (set step), `#idle` (yield), `#shoot <dir> [kind]` / `#shoot at <x> <y>` (projectile; melee idiom), `#become <kind>`, `#die`, `#put`, `#send`, `#give`/`#take`/`#set`/`#clear`.

## Master parity table

Status legend: `ok` close to ZZT / `partial` playable but diverges / `stub` placeholder logic / `missing` no codepage / `n/a` engine-only, `flags` terrain flags only.
Priority: **P0** wrong AI/contact, **P1** item/interaction, **P2** terrain/visual, **P3** engine-only (no action needed).

| ID | ZZT name | kind | cafe | cycle | flags (ZZT) | status | fix priority | ZZT one-line | cafe one-line |
|----|----------|------|------|-------|-------------|--------|--------------|--------------|---------------|
| 0 | Empty | empty | n/a | -1 | walk, push | n/a | P3 | nothing | (engine) |
| 1 | Board edge | boardedge | n/a | -1 | - | n/a | P3 | board transition on touch | (engine) |
| 2 | Message timer | messenger | n/a | -1 | - | n/a | P3 | centered board message countdown | (engine) |
| 3 | Monitor | monitor | n/a | 1 | - | n/a | P3 | title-screen state | (engine) |
| 4 | Player | player | object | 1 | destruct, push, darkvis | partial | P1 | move/shoot/torch, energizer+torch upkeep | large custom sidebar+input script |
| 5 | Ammo | ammo | object | -1 | push | ok | - | +5 ammo, msg | `#give ammo 5`, die |
| 6 | Torch | torch | object | -1 | darkvis | ok | - | +1 torch, msg | `#give torches`, die |
| 7 | Gem | gem | object | -1 | destruct, push | ok | - | +1 gem, +1 health, +10 score | matches |
| 8 | Key | key | object | -1 | push | ok | P2 | grab key by `color mod 8` | matches on fg `color` (correct); only garbage-default name |
| 9 | Door | door | object | -1 | - | ok | P2 | open if key `(color div 16) mod 8` | matches on fg `color` (importer-flipped, correct) |
| 10 | Scroll | scroll | object | 1 | push | ok | - | run OOP text, rainbow, remove | zssedit text, rainbow, die |
| 11 | Passage | passage | object | 0 | darkvis | partial | P1 | teleport to matching passage on target board | `#goto p3` (board name) |
| 12 | Duplicator | duplicator | object | 2 | - | ok | - | copy element at +step to -step; rate `(9-P2)*3` | matches |
| 13 | Bomb | bomb | object | 6 | push | partial | P1 | P1 9->0 countdown, blast radius | cycle 12, `within 5` blast + bombsmoke |
| 14 | Energizer | energize | energizer | -1 | - | partial | P1 | 75 invincible ticks, `ALL:ENERGIZE` | gives `energized 128`, `#all:energize` |
| 15 | Star | star | object | 1 | destruct=no | partial | P1 | seek player, life P2, damage, push | life `p2 100`, seek even ticks |
| 16 | Clockwise | clockwise | object | 3 | - | ok | P2 | rotate 8 neighbors CW | matches |
| 17 | Counter | counter | object | 2 | - | ok | P2 | rotate 8 neighbors CCW | matches |
| 18 | Bullet | bullet | object | 1 | destruct | partial | P1 | move, ricochet, damage, SHOT to obj/scroll | ricochet + die; damage via engine |
| 19 | Water | water | terrain | -1 | placeontop | partial | P1 | blocks player (msg), bullets/shark pass | `@isswimable` |
| 20 | Forest | forest | object | -1 | - | partial | P1 | blocks; cleared to empty on touch | `@isitem`, die on touch |
| 21 | Solid | solid | terrain | -1 | - | ok | - | wall | `@issolid` |
| 22 | Normal | normal | terrain | -1 | - | ok | - | wall | `@issolid` |
| 23 | Breakable | breakable | terrain | -1 | - | ok | - | wall destroyed by shot/creature | `@issolid @isbreakable` |
| 24 | Boulder | boulder | object | -1 | push | ok | - | pushable block | `@ispushable` |
| 25 | Slider NS | sliderns | object | -1 | (push NS) | ok | - | push vertical only | `@ispushable n s` |
| 26 | Slider EW | sliderew | object | -1 | (push EW) | ok | - | push horizontal only | `@ispushable e w` |
| 27 | Fake | fake | terrain | -1 | walk, placeontop | partial | P2 | walkable wall + msg | `@iswalkable` (no msg) |
| 28 | Invisible | invisible | object | -1 | - | ok | - | reveal to normal on touch | `#become normal` |
| 29 | Blink wall | blinkwall | object | 1 | - | partial | P1 | emit/retract blink ray, P1 start P2 period | implemented, verify |
| 30 | Transporter | transporter | object | 2 | - | partial | P1 | teleport across gap in step dir | `#transport senderid` |
| 31 | Line | line | object | -1 | - | ok | P2 | wall glyph by line/edge neighbors | matches (16 glyphs) |
| 32 | Ricochet | ricochet | terrain | -1 | - | ok | - | bounces bullets | `@issolid` (bullet handles bounce) |
| 33 | Blink ray EW | blinkew | terrain | -1 | - | ok | P3 | runtime ray from blink wall | terrain shell |
| 34 | Bear | bear | object | 3 | destruct, push | ok | - | seek within `8-P1`, contact damage | seek + `#shoot` melee on thud |
| 35 | Ruffian | ruffian | object | 1 | destruct, push | ok | - | rest/rush, contact damage | seek/rest + `#shoot` melee on thud |
| 36 | Object | object | object | 3 | - | ok | - | author OOP program | zssedit stub (author-provided) |
| 37 | Slime | slime | object | 3 | destruct=no | partial | P1 | spread leaving breakable trail | matches roughly |
| 38 | Shark | shark | object | 3 | destruct=no | partial | P0 | swim in water only, contact damage | melee ok; verify water-gated move + non-destruct |
| 39 | Spinning gun | spinninggun | object | 2 | - | partial | P1 | fire bullet/star by P1/P2 | matches roughly |
| 40 | Pusher | pusher | (missing) | 4 | - | missing | P0 | march in step dir, push, chain pushers | **no codepage** |
| 41 | Lion | lion | object | 2 | destruct, push | ok | - | `P1<rnd10` rnd else seek, contact damage | seek/rnd + `#shoot` melee on thud |
| 42 | Tiger | tiger | object | 2 | destruct, push | ok | - | lion move + fire bullet/star by P2 | move + fire, uses p3 for type |
| 43 | Blink ray NS | blinkns | terrain | -1 | - | ok | P3 | runtime ray from blink wall | terrain shell |
| 44 | Centipede head | head | object | 2 | destruct | stub | P0 | seek P1/deviance P2, drag segment chain | `?rnd` + `#shoot seek` (no chain) |
| 45 | Centipede segment | segment | object | 2 | destruct | stub | P0 | follow leader head | `?rnd` + `#shoot seek` (no chain) |
| 47-53 | Text (7 colors) | customtext | terrain | -1 | - | partial | P2 | colored text tile | single `text`/`customtext` terrain |
| - | (cafe only) | bombsmoke | object | 2 | - | ok | - | (not ZZT) bomb blast VFX | flicker then die |

Coverage gaps at a glance:

- **Missing:** `pusher` (E_PUSHER=40).
- **Stubs needing real AI:** `head`, `segment` (centipede leader/follower chain).
- **`shark`:** melee (`#shoot`) is fine; fix is water-gated movement + non-destructible.
- **Melee note:** `lion`/`tiger`/`bear`/`ruffian` `#shoot`-on-thud is the intended contact-damage idiom -- keep it (not a bug).
- **Naming:** cafe page is `energizer`; ZZT import kind is `energize` in [`zzt.ts`](../../../../zss/feature/parse/zzt.ts).
- **Cafe-only:** `bombsmoke` (VFX helper, keep).

---

## Creatures

Melee reminder: contact damage is represented by `#shoot at senderx sendery` on `:thud` (see the tick-model note) -- this is the intended idiom, so it is correct in lion/tiger/bear/ruffian below. The creature bugs worth fixing are in *movement/AI*.

ZZT movement helpers: `CalcDirectionRnd` = random of 4 dirs (`?rnd`), `CalcDirectionSeek` = step toward player (`?seek`), `Signum` = -1/0/1, `Difference` = abs delta.

### Lion (41) -- `lion-sid_8jzLhq6RieiL`

- **ZZT tick:** `if P1 < Random(10) then rnd else seek`; if dest walkable `MoveStat`, else if dest is player `BoardAttack`. Cycle 2. `ElementDamagingTouch` = `BoardAttack` when the player pushes into it. Score 1. P1 = Intelligence.
- **Cafe now:** picks `?rnd`/`?seek`, then `:thud` -> `#if any at senderx sendery player #shoot at senderx sendery`; `:shot #die`.
- **Status:** ok. The `#shoot`-on-thud melee is the intended idiom. Just confirm `?rnd/?seek` alternate correctly with P1 (Intelligence). No change required.

### Tiger (42) -- `tiger-sid_6e_bOqewuBBk`

- **ZZT tick:** shoots `E_BULLET` (or `E_STAR` if `P2 >= $80`) when `(Random(10)*3) <= (P2 mod $80)` and player within 2 tiles on an axis; then runs the **lion** tick (move + melee). P1 intel, P2 firing rate (+high bit = star).
- **Cafe now:** fires when `(random 10)*3 <= p2` and `abs dx<=2 or abs dy<=2`, type from `p3` (bullet/star), then `?rnd/?seek`; `:thud #shoot at ... player`; `:shot #die`.
- **Status:** ok. Splitting firing-type into `p3` is a fine, flagged deviation (ZZT overloads the P2 high bit); melee `:thud` idiom is correct. Optional parity tweak: ZZT checks X-within-2 then Y-within-2 separately rather than either-axis.

### Bear (34) -- `bear-sid_V5FcTvuWHYOr`

- **ZZT tick:** if `X != playerX` and `Difference(Y,playerY) <= 8-P1` -> step in X toward player; else if `Difference(X,playerX) <= 8-P1` -> step in Y; else stand. Move if walkable; `BoardAttack` if dest is player **or breakable**. Cycle 3, P1 = Sensitivity, score 1.
- **Cafe now:** computes dx/dy, moves toward player within `8-p1` band on each axis, `:thud` shoots player or breakable; `:shot #die`.
- **Status:** ok. Movement band and cycle 3 are correct; the `#shoot`-melee against player and breakable is the intended idiom (bear "eats" breakable walls by contact). No change required.

### Ruffian (35) -- `ruffian-sid_Rpd0b1r0fOsp`

- **ZZT tick:** if stopped: with `(P2+8) <= Random(17)` start moving, seek if `P1 >= Random(9)` else random. If moving: when aligned with player and `Random(9) <= P1` re-seek; move; when `(P2+8) <= Random(17)` stop. Melee on player. P1 intel, P2 resting time, score 2.
- **Cafe now:** mirrors the rest/rush with `#walk seek/rnd/idle`, `:thud` shoots player.
- **Status:** ok. Logic structure matches; `#shoot`-melee idiom is correct. Verify `aligned` matches ZZT (same row or column as player).

### Shark (38) -- `shark-sid_xoTocNz9Bkeo`

- **ZZT tick:** `if P1 < Random(10) then rnd else seek`; **move only onto `E_WATER`**; if dest is player `BoardAttack`. Not destructible (bullets pass over). Cycle 3, P1 intel.
- **Cafe now:** `?rnd/?seek` then `#if contact shoot seek` -- the `#shoot seek` is an acceptable melee toward the player, but movement is not obviously constrained to water.
- **Fix notes (P0):** the melee (`#shoot`) is fine. Real fixes: (1) shark must only step onto water tiles, (2) be non-destructible so bullets pass over it. `@isswimming` sets `ISSWIM` collision -- confirm that actually restricts movement to water; if not, gate `?rnd/?seek` on a water dest before moving.

### Centipede head (44) / segment (45) -- `head-sid_wG_XV_VD57jG`, `segment-sid_jCUP_m2AaDhb`

- **ZZT head tick:** align to player with prob `P1/10` (deviance `P2` adds random turns); if blocked, try perpendicular then reverse then back-follower; if truly stuck, **head becomes a segment and the tail reverses (chain flips direction)**; on hitting player `BoardAttack`; otherwise `MoveStat` and drag each follower into the previous cell, linking new segments found adjacent. P1 intel, P2 deviance, score 1.
- **ZZT segment tick:** passive; only promotes to head if its leader link is broken (`Leader < -1`). Score 3.
- **Cafe now:** both are identical stubs: `:think ?rnd #think`, `:touch #shoot seek`, `:shot/:bombed #die`. No leader/follower chain, no head/segment promotion.
- **Fix notes (P0):** this is the biggest gap. Implement the head as the mover that seeks with `P1` bias and `P2` deviance and pulls a follower chain (store follower/leader ids, e.g. via `p`-slots or `senderid` links); segment should follow its leader and only become a head when detached. The `#shoot seek` melee is fine to keep for contact damage.

### Pusher (40) -- MISSING

- **ZZT tick:** if the tile ahead (`Step`) is not walkable, `ElementPushablePush` it; then if now walkable, `MoveStat` forward and play a sound; if the pusher two tiles **behind** (`-2*Step`) is another pusher facing the same way, tick it too (chain). Cycle 4, glyph by direction (`16 > `, `17 <`, `30 ^`, `31 v`), dir param.
- **Fix notes (P0):** add a `pusher` object codepage. `@cycle 4`, direction from `stepx/stepy` (or shoot params), glyph per direction, each tick `#push` the tile ahead then `#walk` forward. Register the kind so imports (`E_PUSHER`) resolve.

---

## Items and interactive (P1)

### Ammo (5), Torch (6), Gem (7) -- close to ZZT

- **ZZT:** ammo `+5`; torch `+1`; gem `+1 gem, +1 health, +10 score`. Each clears its tile, plays a sound, shows a first-time message.
- **Cafe:** `ammo #give ammo 5`; `torch #give torches`; `gem #give gems/health/score 10`. All good. Keep the one-time note pattern (`#give <note> do ... #done`).

### Key (8) / Door (9) -- `key-...`, `door-...`

- **ZZT key:** `key := Color mod 8`; if already held -> "already have"; else set flag, remove tile, "you now have the KEY key".
- **ZZT door:** `key := (Color div 16) mod 8` (the **background/high nibble** picks the color); if held -> open (clear flag, remove tile); else "locked".
- **Import normalization (important):** [`zss/feature/parse/zzt.ts`](../../../../zss/feature/parse/zzt.ts) imports a door with `strcolorflipped` = `mapcolortostrcolor((bg+8)%16, fg)`, so the ZZT door's **background-nibble key color becomes the cafe door's foreground**. Keys import with plain `strcolor` (fg kept). Net: an imported blue door and a blue key both end up with fg `color` 9 -> flag `key9`. So matching on foreground `color` is **correct and consistent**, not a bug.
- **Cafe now:** key maps fg `color` (9-15) to a name, sets `key$color`, `#die`; door renders `displaycolor white` on `displaybg = color % 8` and opens when `key$color` is held (`#clear` + `#die`), else "locked". Blocking works because an unopened door is an object the player can't pass.
- **Real latent issues (not the nibble):**
  1. Placeholder name `#set p1 "#$%@!"` leaks into the message ("You now have the `#$%@!` key") if an authored key/door has a `color` outside 9-15. Give a sane default.
  2. Only 7 colors (9-15) are handled -- fine for ZZT parity; revisit only if cafe wants keys/doors in all colors.
  3. `key0` is cleared by the player setup but never granted/consumed by key/door (dead flag).

### Passage (11) -- `passage-...`

- **ZZT:** `BoardPassageTeleport` -- switch to the target board and move the player to the passage there whose color matches. P0 unused, board param stored.
- **Cafe now:** `:touch #goto p3` where `p3` is target board name text.
- **Fix notes:** confirm `#goto` lands the player on the matching passage tile (color-matched) on the destination board, not just the board origin; ZZT pairs passages by color.

### Bomb (13) -- `bomb-...`

- **ZZT:** touch with `P1=0` arms it (`P1:=9`, "Bomb activated!"); tick counts `P1` down, at `P1=1` pre-blast, at `P1=0` `DrawPlayerSurroundings(phase 2)` damages/removes destructibles in radius. Pushable, cycle 6, glyph `48+P1` while counting.
- **Cafe now:** `@cycle 12`, `:touch` arms `p1 9`, tick counts down, at 0 `#put within 5 i bombsmoke` + `#send within 5 i bombed` + `#die`, glyph `48+p1`.
- **Fix notes:** behavior is a good adaptation. Verify blast radius (`within 5`) matches ZZT's surroundings radius and that `bombed` recipients (creatures/breakable) actually take damage. Cycle 12 vs 6 changes fuse speed -- adjust if parity matters.

### Energizer (14) -- `energizer-...`

- **ZZT:** `EnergizerTicks := 75`, message, `OopSend(ALL:ENERGIZE)`, tile removed; player tick blinks colors and, at 10 left, warns, at 0 restores. Player is invincible while ticks > 0.
- **Cafe now:** `#give energized 128`, note, `#all:energize`, `#die`; player script decrements `energized`, blinks char/color.
- **Fix notes:** functional. `128` vs `75` changes duration -- pick one for parity. Ensure invincibility (damage ignored) is actually enforced in the player `:shot` path while `energized > 0` (current player `:shot` always subtracts health).

### Star (15) -- `star-...`

- **ZZT:** `P2` = lifetime; each tick `P2--`, die at 0; on even `P2` seek player and `BoardAttack` player/breakable, else push/move. Not destructible; draw cycles `/-|\` and rotates color 9-15.
- **Cafe now:** `@p2 100`, rainbow color, glyph by `currenttick%4`, `#take p2`, die at 0, `?seek` on even.
- **Fix notes:** stars are normally spawned by tiger/spinning gun with a set lifetime; `@p2 100` is only a default for hand-placed stars. Ensure a seeking star damages the player and breakables on contact (currently just `?seek`, no attack).

### Bullet (18) -- `bullet-...`

- **ZZT:** move in step dir; onto walkable/water -> continue; onto ricochet -> reverse and retry; onto breakable or destructible (`P1=0` or player) -> `BoardAttack` (+score); check perpendicular ricochets; else remove and send `SHOT` to an object/scroll it hit.
- **Cafe now:** on blocked, tries cw/ccw/opposite ricochet neighbors and re-walks; else idle; `:thud/:shot #die`.
- **Fix notes:** ensure a bullet hitting a creature/breakable/object delivers damage (target `:shot`) and awards score, and that friendly vs enemy bullets use `P1` (0 = player shot damages creatures; enemy shots damage player). The cafe ricochet handling looks right.

### Water (19) / Forest (20) / Fake (27)

- **ZZT water:** not walkable for player (message "blocked by water"), but bullets and sharks pass. **Cafe:** `@isswimable` terrain. Fix: confirm player is blocked (with message) while bullets/shark traverse.
- **ZZT forest:** blocks movement; touching clears it to empty ("path is cleared"). **Cafe:** `@isitem` object that dies on touch with note. Fix: ensure it blocks movement before being cleared (item flag may let the player walk over instead of clearing).
- **ZZT fake:** walkable wall; first touch shows "fake wall - secret passage!". **Cafe:** `@iswalkable` terrain, no message. Fix (P2): optionally restore the one-time message.

---

## Terrain, walls, conveyors, transports

### Solid (21), Normal (22), Breakable (23), Ricochet (32), Boulder (24), Sliders (25/26)

Cafe flags match ZZT. Breakable is destroyed by shots/creatures (bullet special-cases `E_BREAKABLE`); ricochet bounce is handled in the bullet logic. Sliders push on one axis only -- cafe `@ispushable n s` / `e w` matches ZZT's `ElementPushablePush` axis guard. No changes needed beyond confirming push chains via `ElementPushablePush` (recursive push, damages destructible non-player tiles in the way).

### Conveyors -- Clockwise (16) / Counter (17)

- **ZZT:** rotate the 8 surrounding tiles one slot (CW cycle 3, CCW cycle 2); only pushable tiles move, blocked by non-pushable; stat-bearing tiles moved via `MoveStat`. Glyph animates `| / - \`.
- **Cafe:** `clockwise` (cycle 3) and `counter` (cycle 2) walk the 8 neighbors with directional `#push` and animate the glyph. Matches. (P2 -- verify edge cases where a neighbor is a stat object.)

### Transporter (30) -- `transporter-...`

- **ZZT:** on touch from the matching step direction, search along the dir for the next walkable landing (skipping paired transporters), push obstacles, move the entrant there, sound. Draw animates `( < (` / `^ ~ ^` by direction.
- **Cafe:** animates glyph by `shootx/shooty` and `:touch #transport senderid`.
- **Fix notes:** confirm `#transport` reproduces "skip to the far side / next transporter" landing search and only triggers when entering from the active direction (ZZT checks `deltaX=StepX`).

### Blink wall (29) + rays (33/43) -- `blinkwall-...`, `blinkew`, `blinkns`

- **ZZT:** `P3` timer starts at `P1+1`; when it hits 1, either clears its existing ray (matching element+color along the step dir) or, if none, extends a ray until blocked -- damaging destructibles and pinning/killing a player caught in it -- then resets `P3 := P2*2+1`. Ray element is `E_BLINK_RAY_EW`/`NS` by orientation.
- **Cafe:** `blinkwall` implements start/period with `p3`, clears then writes `blinkew`/`blinkns` tiles along `shootx/shooty`, sends `shot` to the end. The ray kinds are terrain shells.
- **Fix notes:** verify the ray damages destructibles and traps the player (ZZT drains player health if caught with no escape). Keep `blinkew`/`blinkns` as runtime-only tiles.

### Line (31) -- `line-...`

Cafe computes the glyph from N/S/W/E line/edge neighbors (16-way) matching `ElementLineDraw`. Good.

### Text (47-53) / customtext

- **ZZT:** 7 elements, one per color; the character is stored in the color byte, drawn as text.
- **Cafe:** a single `text` terrain plus `customtext`. Fix (P2): if authored ZZT worlds rely on the 7 color variants, map each to the correct color; otherwise document that cafe collapses them.

---

## Player (4) -- `player-...`

Large custom script (sidebar rendering, hotkeys, input, torch/energizer upkeep). Compare against `ElementPlayerTick` rather than replacing:

- **ZZT per tick:** handle movement/shoot input; if `TorchTicks > 0` decrement (relight surroundings at 0); if `EnergizerTicks > 0` decrement (blink, warn at 10, restore at 0); board time limit damage.
- **Cafe:** does the above via `energized`/`wick`/`torches`, blinking, reload gating, `:shot` health loss.
- **Fix notes:** the one correctness item is invincibility -- `:shot` should ignore damage while `energized > 0` to match ZZT. Otherwise treat the cafe player as the intended richer superset (sidebar, FPV turning) and do not regress it to bare ZZT.

---

## Shared mechanics appendix

- **Damaging/contact (`BoardAttack`)** -- creature deals damage to the player (or is destroyed hitting a player shot). Model as melee on adjacency + `#die` on `:shot`, never as a projectile. Used by lion, tiger, bear, ruffian, shark, head, segment, star, bullet.
- **Push (`ElementPushablePush`)** -- recursive: push the tile ahead first; if the pushed-into tile is a transporter, transport; damage a destructible non-player tile blocking the way; slider axis guard. Boulder/sliders/creatures rely on this.
- **Conveyor rotation** -- 8-neighbor ring shift; only pushable tiles move; stat tiles via `MoveStat`.
- **Bomb blast / torch radius** -- `DrawPlayerSurroundings` uses `TORCH_DX=8, TORCH_DY=5, TORCH_DIST_SQR=50`; the bomb blast damages destructibles within that lit area. Cafe approximates with `within 5`.
- **Board edge / passage transitions** -- engine-owned (`ElementBoardEdgeTouch`, `BoardPassageTeleport`); do not script as element codepages.
- **`bombsmoke` (cafe-only)** -- transient flicker spawned by the bomb blast; not a ZZT element, keep as VFX.

## Suggested fix order

1. **P0 creatures:** add `pusher`; give `head`/`segment` real centipede chain AI; gate `shark` movement to water and make it non-destructible. (lion/tiger/bear/ruffian `#shoot`-on-thud melee is intended -- no change.)
2. **P1 items/interactions:** energizer invincibility (+ note the 128-vs-75 duration deviation); star/bullet contact damage + score; water/forest blocking; bomb radius (note fuse cycle deviation); passage color pairing; transporter landing search; blink-wall ray damage.
3. **P2 terrain/visual:** fake message; text color variants; conveyor stat-tile edge cases; migrate animated glyphs (star, duplicator, transporter, spinning gun, bomb, conveyors, line, blink wall) from `:think` `#char` / `:calcdisplay` `#send` to `:drawdisplay`.
4. **P3:** engine-only ids (empty/edge/message/monitor, blink rays) -- no codepage.

## Verification

Fix the element codepages in the coolregionsbow book, then check behavior against ZZT sources and the existing fixtures:

- **ZZT corpus (real worlds):** `ops/fixtures/zzt/corpus/` -- import/parse/OOP-compile coverage over real ZZT games. Rebuild/refresh via `yarn task run ops:fixtures:zzt:corpus:build` (deps: `:extract`, `:zss`, `:sanitize`); see [`tasks/groups/ops/fixtures/zzt.ts`](../../../../tasks/groups/ops/fixtures/zzt.ts). Use this to confirm imports still map every kind (and that `pusher` now resolves).
- **Lang parity fixtures:** [`ops/fixtures/lang/parity/`](../parity/) + `manifest.json` (includes `drawdisplay`). Run `yarn task run ops:fixtures:lang:regression:test` ([`tasks/groups/ops/fixtures/lang.ts`](../../../../tasks/groups/ops/fixtures/lang.ts)) after changing any codepage that uses `:drawdisplay` or new commands.
- **Draw-pass unit tests:** `ops/tests/unit/memory/boardoperations.drawpass.test.ts` and `ops/tests/unit/memory/wasm/regenfixtures.test.ts` cover `:drawdisplay` collection/allow-ids -- run the relevant file with `yarn jest <file> --config ops/jest.config.ts --no-coverage` when touching draw logic.
- **Manual in-sim:** load the coolregionsbow library (`loadcoolregionsbowelementlibrary`) and exercise each fixed kind (creature melee/AI, item pickup counts, conveyor/transporter/blink-wall visuals) against ZZT behavior from `ELEMENTS.PAS`.
