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
| `BoardAttack` -- contact damage to player | `Game.pas` | melee idiom: `#send at senderx sendery shot` on `:thud` / `:touch` (not a point-blank `#shoot`) |
| `BoardShoot` -- spawn bullet/star | `Game.pas` | `#shoot dir` / `#shoot dir star` |
| `DamageStat` / `BoardDamageTile` | `Game.pas` | `:shot` (and bomb also `:bombed`) -> `#die` / breakable auto-clear on `:shot` |
| `OopSend(-stat,'SHOT')` from a bullet hit | bullet tick | target `:shot` label |
| `OopSend(-stat,'THUD')` from object walk | `ElementObjectTick` | blocked step → `:thud` **to the walker** (sender = blocker) |
| `OopSend(-stat,'TOUCH')` | `ElementObjectTouch` | player walks into object → `:touch` to that object |

**Blocked-walk labels (RoZZT `ElementObjectTick`):** cafe sends `:thud` to the **moving** non-bullet object when its dest is blocked (wall, player, other object); sender is the blocker. Player tile is not walkable, so creature → player is `:thud` on the creature (not dual `:touch`). No second label to the obstacle on this path (`:bump` remains same-party `:touch` remap only).

**Player-initiated contact:** player walks into an object → `:touch` (RoZZT `TOUCH` / `ElementDamagingTouch`). Melee kinds use `:thud` / `:touch` fallthrough + `#send at senderx sendery shot` to approximate `BoardAttack`. Ranged fire still uses `#shoot`.

## Animated glyphs: use `:drawdisplay`, not `:think`

ZZT `DrawProc` is a **render-time** hook: it recomputes an element's glyph every frame from `CurrentTick` and neighbors, separately from gameplay. The zss equivalent is the `:drawdisplay` label, not per-tick `#char` inside `:think`.

How it works (see [`zss/memory/boardtick.ts`](../../../../zss/memory/boardtick.ts) and [`zss/memory/boarddrawdirty.ts`](../../../../zss/memory/boarddrawdirty.ts)):

- Each board tick builds two passes. The **draw pass** runs only the `:drawdisplay` label (dispatched with `label: 'drawdisplay'`); an element is included only if its code defines that label (`memorycodehasdrawdisplay`, compiled + cached). The draw pass is resolved **before** the tick/`:think` pass each frame.
- **Terrain participates.** Terrain never `:think`s, but terrain with `:drawdisplay` still redraws -- this is the correct home for wall-glyph logic (e.g. `line`).
- **Incremental + neighbor-aware.** `memoryupdatedrawdirty` fingerprints each element (x, y, char, color, bg, `display*`, light, code, ...); changed cells seed an **8-neighbor** expansion into a `drawallowids` set, and only those ids re-run `:drawdisplay` next frame. So a neighbor-dependent glyph (line connectors, blink rays) recomputes automatically when an adjacent cell changes -- no manual `#send` fan-out needed.
- For non-local visual changes fingerprints can't see, call `memoryinvalidatedraw(board)` to force a full redraw.

Implications for the elements below:

- Put animated/derived glyphs in `:drawdisplay` (ending `#end`): star `/-|\` spin + rainbow, duplicator `250/249/248/o/O` phase, transporter `( < (` / `^ ~ ^`, spinning gun `24/26/25/27`, bomb `48+P1` countdown, conveyor `| / - \`. **P1 done** for these kinds (+ `line`). Place the `:drawdisplay` label **last** in the codepage.
- Set `char`/`color` (or `displaychar`/`displaycolor`/`displaybg`) there; keep `:think` for movement/AI only.
- The cafe `line` uses `:drawdisplay` with neighbor bitmask (8-neighbor dirty) -- no `:calcdisplay` / `#send` fan-out.

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
| `key<color>` (cafe: `keyblack`, `keyblue`..`keywhite` via `$color` name) | key grants, door consumes | `World.Info.Keys[1..7]` |
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

- **Labels:** `:think` (tick loop), `:touch` (walked into), `:thud` (movement blocked), `:shot` (damage event -- bullet hit, melee `#send … shot`, bomb blast), `:bombed` (bomb blast companion label; no engine auto-delete), `:bump`, `:drawdisplay` (render pass).
- **Direction words (`?dir` / `#walk`):** `rnd`, `seek`, `flow`, `cw`, `ccw`, `at <x> <y>`, plus `n/s/e/w`.
- **Move/act:** `#go <dir>` (move+yield), `#walk <dir>` (set step), `#idle` (yield), `#shoot <dir> [kind]` (projectile), `#send at <x> <y> shot` (contact / cell damage), `#become <kind>`, `#die`, `#put`, `#send`, `#give`/`#take`/`#set`/`#clear`.

## Master parity table

Status legend: `ok` close to ZZT / `partial` playable but diverges / `stub` placeholder logic / `missing` no codepage / `n/a` engine-only, `flags` terrain flags only.
Priority: **P0** wrong AI/contact, **P1** item/interaction, **P2** terrain/visual, **P3** engine-only (no action needed).

| ID | ZZT name | kind | cafe | cycle | flags (ZZT) | status | fix priority | ZZT one-line | cafe one-line |
|----|----------|------|------|-------|-------------|--------|--------------|--------------|---------------|
| 0 | Empty | empty | n/a | -1 | walk, push | n/a | P3 | nothing | (engine) |
| 1 | Board edge | boardedge | n/a | -1 | - | n/a | P3 | board transition on touch | (engine) |
| 2 | Message timer | messenger | n/a | -1 | - | n/a | P3 | centered board message countdown | (engine) |
| 3 | Monitor | monitor | n/a | 1 | - | n/a | P3 | title-screen state | (engine) |
| 4 | Player | player | object | 1 | destruct, push, darkvis | ok | - | move/shoot/torch, energizer+torch upkeep | `:shot` ignores damage while `energized`; water thud msg |
| 5 | Ammo | ammo | object | -1 | push | ok | - | +5 ammo, msg | `#give ammo 5`, die |
| 6 | Torch | torch | object | -1 | darkvis | ok | - | +1 torch, msg | `#give torches`, die |
| 7 | Gem | gem | object | -1 | destruct, push | ok | - | +1 gem, +1 health, +10 score | matches |
| 8 | Key | key | object | -1 | push | ok | P2 | grab key by `color mod 8` | matches on fg `color` (correct); only garbage-default name |
| 9 | Door | door | object | -1 | - | ok | P2 | open if key `(color div 16) mod 8` | matches on fg `color` (importer-flipped, correct) |
| 10 | Scroll | scroll | object | 1 | push | ok | - | run OOP text, rainbow, remove | zssedit text, rainbow, die |
| 11 | Passage | passage | object | 0 | darkvis | ok | - | teleport to matching passage on target board | `#goto p3` + firmware color match |
| 12 | Duplicator | duplicator | object | 2 | - | ok | - | copy element at +step to -step; rate `(9-P2)*3` | `:drawdisplay` phase glyphs |
| 13 | Bomb | bomb | object | 6 | push | ok | - | P1 9->0 countdown, blast radius | cycle **12** (vs ZZT 6), `within 5` + bombsmoke |
| 14 | Energizer | energize | energizer | -1 | - | ok | - | 75 invincible ticks, `ALL:ENERGIZE` | `energized` **128** (vs 75); invuln on `:shot` |
| 15 | Star | star | object | 1 | destruct=no | ok | - | seek player, life P2, damage, push | `:drawdisplay` spin; `:thud` melee |
| 16 | Clockwise | clockwise | object | 3 | - | ok | - | rotate 8 neighbors CW | `:drawdisplay` spin; push in `:think` |
| 17 | Counter | counter | object | 2 | - | ok | - | rotate 8 neighbors CCW | `:drawdisplay` spin; push in `:think` |
| 18 | Bullet | bullet | object | 1 | destruct | ok | - | move, ricochet, damage, SHOT to obj/scroll | ricochet; engine `:shot`; creature score |
| 19 | Water | water | terrain | -1 | placeontop | ok | - | blocks player (msg), bullets/shark pass | `@isswimable`; player `:thud` msg |
| 20 | Forest | forest | object | -1 | - | ok | - | blocks; cleared to empty on touch | `@isitem`, die on touch (keep) |
| 21 | Solid | solid | terrain | -1 | - | ok | - | wall | `@issolid` |
| 22 | Normal | normal | terrain | -1 | - | ok | - | wall | `@issolid` |
| 23 | Breakable | breakable | terrain | -1 | - | ok | - | wall destroyed by shot/creature | `@issolid @isbreakable` |
| 24 | Boulder | boulder | object | -1 | push | ok | - | pushable block | `@ispushable` |
| 25 | Slider NS | sliderns | object | -1 | (push NS) | ok | - | push vertical only | `@ispushable n s` |
| 26 | Slider EW | sliderew | object | -1 | (push EW) | ok | - | push horizontal only | `@ispushable e w` |
| 27 | Fake | fake | terrain | -1 | walk, placeontop | partial | P2 | walkable wall + msg | `@iswalkable` (no msg) |
| 28 | Invisible | invisible | object | -1 | - | ok | - | reveal to normal on touch | `#become normal` |
| 29 | Blink wall | blinkwall | object | 1 | - | ok | - | emit/retract blink ray, P1 start P2 period | `#send shot` along full ray |
| 30 | Transporter | transporter | object | 2 | - | ok | - | teleport across gap in step dir | `#transport` skips transporters, lands first walkable |
| 31 | Line | line | object | -1 | - | ok | - | wall glyph by line/edge neighbors | `:drawdisplay` (no `:calcdisplay` fan-out) |
| 32 | Ricochet | ricochet | terrain | -1 | - | ok | - | bounces bullets | `@issolid` (bullet handles bounce) |
| 33 | Blink ray EW | blinkew | terrain | -1 | - | ok | P3 | runtime ray from blink wall | terrain shell |
| 34 | Bear | bear | object | 3 | destruct, push | ok | - | seek within `8-P1`, contact damage | seek + `#send … shot` melee; `:shot #give score 1` |
| 35 | Ruffian | ruffian | object | 1 | destruct, push | ok | - | rest/rush, contact damage | seek/rest + `#send … shot`; `:shot #give score 2` |
| 36 | Object | object | object | 3 | - | ok | - | author OOP program | zssedit stub (author-provided) |
| 37 | Slime | slime | object | 3 | destruct=no | partial | P2 | spread leaving breakable trail | matches roughly |
| 38 | Shark | shark | object | 3 | destruct=no | ok | - | swim in water only, contact damage | `@isswimming` + `@notbreakable` + `:thud` melee |
| 39 | Spinning gun | spinninggun | object | 2 | - | ok | - | fire bullet/star by P1/P2 | `:drawdisplay` arrows; fire in `:think` |
| 40 | Pusher | pusher | object | 4 | - | ok | - | march in step dir, push, chain pushers | glyph from step; `#idle`/`#think` (move+push via everytick step) |
| 41 | Lion | lion | object | 2 | destruct, push | ok | - | `P1<rnd10` rnd else seek, contact damage | seek/rnd + `#send … shot`; `:shot #give score 1` |
| 42 | Tiger | tiger | object | 2 | destruct, push | ok | - | lion move + fire bullet/star by P2 | move + fire; `:shot #give score 2` |
| 43 | Blink ray NS | blinkns | terrain | -1 | - | ok | P3 | runtime ray from blink wall | terrain shell |
| 44 | Centipede head | head | object | 2 | destruct | ok | - | seek P1/deviance P2, drag segment chain | script chain; `:shot #give score 1` |
| 45 | Centipede segment | segment | object | 2 | destruct | ok | - | follow leader head | promote on detach; `:shot #give score 3` |
| 47-53 | Text (7 colors) | customtext | terrain | -1 | - | partial | P2 | colored text tile | single `text`/`customtext` terrain |
| - | (cafe only) | bombsmoke | object | 2 | - | ok | - | (not ZZT) bomb blast VFX | flicker then die |

Coverage gaps at a glance:

- **P0 creatures done:** `pusher` added; `head`/`segment` script-only chain; `shark` water-gated + non-destructible. Also mirrored into darkpianoshammer ZTK.
- **P1 items/interactions done:** energizer invuln (128 vs 75 kept); star/bullet damage + creature score; water msg + forest `@isitem`; bomb cycle 12 kept; passage color `#goto`; transporter landing search; blink-wall ray `:shot` along path; `:drawdisplay` glyph migration.
- **Melee note:** `lion`/`tiger`/`bear`/`ruffian` use `#send at senderx sendery shot` on `:thud` / `:touch` for contact damage -- keep it (not a bug).
- **Naming:** cafe page is `energizer`; ZZT import kind is `energize` in [`zzt.ts`](../../../../zss/feature/parse/zzt.ts).
- **Cafe-only:** `bombsmoke` (VFX helper, keep).

---

## Creatures

Melee reminder: contact damage is `#send at senderx sendery shot` on `:thud` / `:touch` (blocked walk = RoZZT `THUD` to mover; player walks in = `:touch`) -- not point-blank `#shoot`. Correct in lion/tiger/bear/ruffian/shark/head/segment/star. The creature bugs worth fixing are in *movement/AI*.

ZZT movement helpers: `CalcDirectionRnd` = random of 4 dirs (`?rnd`), `CalcDirectionSeek` = step toward player (`?seek`), `Signum` = -1/0/1, `Difference` = abs delta.

### Lion (41) -- `lion-sid_8jzLhq6RieiL`

- **ZZT tick:** `if P1 < Random(10) then rnd else seek`; if dest walkable `MoveStat`, else if dest is player `BoardAttack`. Cycle 2. `ElementDamagingTouch` = `BoardAttack` when the player pushes into it. Score 1. P1 = Intelligence.
- **Cafe now:** picks `?rnd`/`?seek`, then `:thud` / `:touch` -> `#if any at senderx sendery player #send at senderx sendery shot`; `:shot #give score 1` then `#die`.
- **Status:** ok. The `#send … shot` melee is the intended idiom. Just confirm `?rnd/?seek` alternate correctly with P1 (Intelligence). No change required.

### Tiger (42) -- `tiger-sid_6e_bOqewuBBk`

- **ZZT tick:** shoots `E_BULLET` (or `E_STAR` if `P2 >= $80`) when `(Random(10)*3) <= (P2 mod $80)` and player within 2 tiles on an axis; then runs the **lion** tick (move + melee). P1 intel, P2 firing rate (+high bit = star).
- **Cafe now:** fires when `(random 10)*3 <= p2` and `abs dx<=2 or abs dy<=2`, type from `p3` (bullet/star), then `?rnd/?seek`; `:thud` / `:touch` `#send at ... shot` on player; `:shot #give score 2` then `#die`.
- **Status:** ok. Splitting firing-type into `p3` is a fine, flagged deviation (ZZT overloads the P2 high bit); melee `:thud` send-shot is correct. Optional parity tweak: ZZT checks X-within-2 then Y-within-2 separately rather than either-axis.

### Bear (34) -- `bear-sid_V5FcTvuWHYOr`

- **ZZT tick:** if `X != playerX` and `Difference(Y,playerY) <= 8-P1` -> step in X toward player; else if `Difference(X,playerX) <= 8-P1` -> step in Y; else stand. Move if walkable; `BoardAttack` if dest is player **or breakable**. Cycle 3, P1 = Sensitivity, score 1.
- **Cafe now:** computes dx/dy, moves toward player within `8-p1` band on each axis, `:thud` / `:touch` shoots player or breakable; `:shot #give score 1` then `#die`.
- **Status:** ok. Movement band and cycle 3 are correct; `#send … shot` against player and breakable is the intended idiom (bear "eats" breakable walls by contact). No change required.

### Ruffian (35) -- `ruffian-sid_Rpd0b1r0fOsp`

- **ZZT tick:** if stopped: with `(P2+8) <= Random(17)` start moving, seek if `P1 >= Random(9)` else random. If moving: when aligned with player and `Random(9) <= P1` re-seek; move; when `(P2+8) <= Random(17)` stop. Melee on player. P1 intel, P2 resting time, score 2.
- **Cafe now:** mirrors the rest/rush with `#walk seek/rnd/idle`, `:thud` / `:touch` shoots player; `:shot #give score 2` then `#die`.
- **Status:** ok. Logic structure matches; `#send … shot` melee idiom is correct. Verify `aligned` matches ZZT (same row or column as player).

### Shark (38) -- `shark-sid_xoTocNz9Bkeo`

- **ZZT tick:** `if P1 < Random(10) then rnd else seek`; **move only onto `E_WATER`**; if dest is player `BoardAttack`. Not destructible. Cycle 3, P1 intel.
- **Cafe now:** `@isswimming` (engine gates move to `@isswimable` water), `@notbreakable`, `?rnd/?seek`, `:thud` / `:touch` -> `#send at senderx sendery shot` on player. No `:shot #die`.
- **Status:** ok. Intentional: sharks **block** bullets and survive (ZZT “pass over” was imprecise; no collision change).

### Centipede head (44) / segment (45) -- `head-sid_wG_XV_VD57jG`, `segment-sid_jCUP_m2AaDhb`

- **ZZT head tick:** align to player with prob `P1/10` (deviance `P2` adds random turns); if blocked, try perpendicular then reverse then back-follower; if truly stuck, **head becomes a segment and the tail reverses (chain flips direction)**; on hitting player `BoardAttack`; otherwise `MoveStat` and drag each follower into the previous cell, linking new segments found adjacent. P1 intel, P2 deviance, score 1.
- **ZZT segment tick:** passive; only promotes to head if its leader link is broken (`Leader < -1`). Score 3.
- **Cafe now:** head-driven same-think drag (no TickProc, no `:preparefollow` / `:dofollow` cascade). Element stats: `p3`=follower id, `p4`=leader id, `p5`=linkgrace. **ZZT import** maps `Follower`/`Leader` onto `p3`/`p4` (and `Leader < -1` onto `p5=1`). Head `:think` (lion-style, first in the script): `#walk rnd` on the `p1` intel roll or the `p2` deviance roll else `#walk seek`, one `#walk rnd` retry when `blocked flow`, adopt a trailing segment with `#pget opp flow id p3`, attack when the dest cell holds the player, else `#pset "$thisid" x|y` (moves without yielding, unlike `#go`) + `#walk idle`, then one `#while` that `#pset`s each follower into the cell the node ahead vacated. Segments are fully passive: `#pget "$p4" id live` and morph to head after the `p5` grace when the leader id no longer resolves -- that one probe covers unlinked, shot, and bombed leaders, so nothing needs `:leaderdied` / `:trylink`. Melee via `:thud`/`:touch` `#send … shot`. Cafe `#morph` is in-place kind change (same id/stats, swap code).
- **Status:** ok (parity-noted). Deliberate simplifications vs `ELEMENTS.PAS`: no alignment-only chase (`seek` approximates it), no cw/ccw/opp turn cascade, and **no full-chain reverse when boxed in** -- a stuck head re-rolls `rnd` instead of flipping the chain, so only a fully enclosed 1-tile pocket holds it. Add the reverse back if stuck centipedes show up in play. After editing kind codepages, `#restart` (chips do not hot-reload). A/B: θ drags ○ same tick; deviance rooms differ; mid-body shot splits via `p5` grace.

### Pusher (40) -- `pusher-sid_u6ehMs9Uc1SI`

- **ZZT tick:** if the tile ahead (`Step`) is not walkable, `ElementPushablePush` it; then if now walkable, `MoveStat` forward and play a sound; if the pusher two tiles **behind** (`-2*Step`) is another pusher facing the same way, tick it too (chain). Cycle 4, glyph by direction (`16 > `, `17 <`, `30 ^`, `31 v`), dir param.
- **Cafe now:** `@cycle 4`, glyph from `stepx`/`stepy` in `:think`, then `#idle`/`#think`. March + pushables come from everytick step via `memorymoveobject` (no `#go` / `#push` — those double-acted). Import already maps `E_PUSHER` -> `pusher`.
- **Status:** ok (parity-noted). Intentional: no explicit “tick pusher two behind”; sequential ticks + auto-push cover most chains. Push does not destroy breakable terrain (existing cafe push gap).

---

## Items and interactive (P1)

### Ammo (5), Torch (6), Gem (7) -- close to ZZT

- **ZZT:** ammo `+5`; torch `+1`; gem `+1 gem, +1 health, +10 score`. Each clears its tile, plays a sound, shows a first-time message.
- **Cafe:** `ammo #give ammo 5`; `torch #give torches`; `gem #give gems/health/score 10`. All good. Keep the one-time note pattern (`#give <note> do ... #done`).

### Key (8) / Door (9) -- `key-...`, `door-...`

- **ZZT key:** `key := Color mod 8`; if already held -> "already have"; else set flag, remove tile, "you now have the KEY key".
- **ZZT door:** `key := (Color div 16) mod 8` (the **background/high nibble** picks the color); if held -> open (clear flag, remove tile); else "locked".
- **Import normalization (important):** [`zss/feature/parse/zzt.ts`](../../../../zss/feature/parse/zzt.ts) imports a door with `strcolorflipped` = `mapcolortostrcolor((bg+8)%16, fg)`, so the ZZT door's **background-nibble key color becomes the cafe door's foreground**. Keys import with plain `strcolor` (fg kept). Net: an imported blue door and a blue key both end up with fg `color` 9 -> flag `keyblue` (via `"key$color"` template print). So matching on foreground `color` is **correct and consistent**, not a bug.
- **Cafe now:** key/door use `$color` in messages and `#set`/`#clear "key$color"` (prints as `keyblue`, etc.); door renders `displaycolor white` on `displaybg = color % 8` and opens when the named key flag is held (`#clear` + `#die`), else "locked". Blocking works because an unopened door is an object the player can't pass.
- **Notes:**
  1. `$color` prints the COLOR enum name for any fg index (not only 9-15).
  2. Player sidebar clears/tests named flags (`keyblue` … `keywhite`, plus `keyblack`).
  3. Existing saves with numeric `key9` flags need a re-pickup (breaking rename).

### Passage (11) -- `passage-...`

- **ZZT:** `BoardPassageTeleport` -- switch to the target board and move the player to the passage there whose color matches. P0 unused, board param stored.
- **Cafe now:** `:touch #goto p3` where `p3` is target board name text. Firmware `#goto` passes kind name + color into `resolveplayergotodestpt`, which lands on the matching passage tile (else `startx/starty`).
- **Status:** ok. Color pairing is engine-owned; covered by `playergotoboard` unit tests.

### Bomb (13) -- `bomb-...`

- **ZZT:** touch with `P1=0` arms it (`P1:=9`, "Bomb activated!"); tick counts `P1` down, at `P1=1` pre-blast, at `P1=0` `DrawPlayerSurroundings(phase 2)` damages/removes destructibles in radius. Pushable, cycle 6, glyph `48+P1` while counting.
- **Cafe now:** `@cycle 12`, `:shot`/`:touch`/`:bombed` arm `p1 9`, tick counts down, at 0 `#put within 5 i bombsmoke` + `#send within 5 i bombed` + `#send within 5 i shot` + `#die`; glyph via `:drawdisplay`.
- **Status:** ok with intentional deviations: **cycle 12 vs ZZT 6** (slower fuse); blast radius `within 5` approximates the torch ellipse. Keep `bombsmoke`. Blast sends **`bombed` then `shot`** so breakable terrain clears via the engine `:shot` rule while `:bombed`-only handlers still run.

### Energizer (14) -- `energizer-...`

- **ZZT:** `EnergizerTicks := 75`, message, `OopSend(ALL:ENERGIZE)`, tile removed; player tick blinks colors and, at 10 left, warns, at 0 restores. Player is invincible while ticks > 0.
- **Cafe now:** `#give energized 128`, note, `#all:energize`, `#die`; player decrements `energized`, blinks; `:shot` is a no-op while `energized > 0`.
- **Status:** ok. **128 vs 75** duration is an intentional cafe deviation. Invincibility is enforced on `:shot`.

### Star (15) -- `star-...`

- **ZZT:** `P2` = lifetime; each tick `P2--`, die at 0; on even `P2` seek player and `BoardAttack` player/breakable, else push/move. Not destructible; draw cycles `/-|\` and rotates color 9-15.
- **Cafe now:** `@notbreakable`, `@p2 100`, `:drawdisplay` rainbow + glyph spin, `:think` lifetime + even-tick `?seek`, `:thud` `#send … shot` at player or breakable.
- **Status:** ok. Hand-placed default `p2 100` only; spawned stars use shoot-time lifetime.

### Bullet (18) -- `bullet-...`

- **ZZT:** move in step dir; onto walkable/water -> continue; onto ricochet -> reverse and retry; onto breakable or destructible (`P1=0` or player) -> `BoardAttack` (+score); check perpendicular ricochets; else remove and send `SHOT` to an object/scroll it hit. OOP `#SHOOT` uses `SHOT_SOURCE_ENEMY` (`P1=1`), so object/tiger bullets do **not** `BoardAttack` creatures.
- **Cafe now:** on blocked, tries cw/ccw/opposite ricochet neighbors and re-walks; else idle; `:thud/:shot #die`. Engine picks collision label via `memorybulletcollisionlabel` (`party` ≈ ZZT `P1`):

| Source (`bullet.party`) | Player | Creature (lion, …) | `object` / `scroll` | `@isbreakable` |
|---|---|---|---|---|
| Player (`ispid`) | `:shot` / `:partyshot` remap | `:shot` | `:shot` | `:shot` + softdelete |
| Object / tiger (`sid_…`) | `:shot` | `:partyshot` (no kill) | `:shot` | `:shot` + softdelete |

  Non-breakable creatures (lion, tiger, head, …) get `:partyshot` from enemy-source bullets. `@isbreakable` (breakable wall, gem, …) gets `:shot` + softdelete from any source. Creatures award ZZT ScoreValues on `:shot` before `#die`.
- **Status:** ok (RoZZT no-creature-kill mapped to cafe `:partyshot` when not `@isbreakable`).

### Water (19) / Forest (20) / Fake (27)

- **ZZT water:** not walkable for player (message "blocked by water"), but bullets and sharks pass. **Cafe:** `@isswimable` terrain; player `:thud` shows `blocked by water`. Status: ok.
- **ZZT forest:** blocks movement; touching clears it to empty ("path is cleared"). **Cafe:** keep `@isitem` object that dies on touch with note (item `#die` yoink). Status: ok -- do not drop `@isitem`.
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
- **Cafe:** `:drawdisplay` glyph by `shootx/shooty`; `:touch #transport senderid`. Firmware `#transport` gates on entrant delta == shoot dir, skips same-kind transporters along the scan, lands on first successful `memorymoveobject` cell (push included).
- **Status:** ok.

### Blink wall (29) + rays (33/43) -- `blinkwall-...`, `blinkew`, `blinkns`

- **ZZT:** `P3` timer starts at `P1+1`; when it hits 1, either clears its existing ray (matching element+color along the step dir) or, if none, extends a ray until blocked -- damaging destructibles and pinning/killing a player caught in it -- then resets `P3 := P2*2+1`. Ray element is `E_BLINK_RAY_EW`/`NS` by orientation.
- **Cafe:** `blinkwall` implements start/period with `p3`, clears then writes `blinkew`/`blinkns` tiles along `shootx/shooty`, `#send … shot` at **each** ray cell (and tip). Ray kinds are terrain shells.
- **Status:** ok. Keep `blinkew`/`blinkns` as runtime-only tiles.

### Line (31) -- `line-...`

Cafe computes the glyph from N/S/W/E line/edge neighbors (16-way) in `:drawdisplay` (8-neighbor dirty expansion). No `:calcdisplay` / `#send` fan-out. Good.

### Text (47-53) / customtext

- **ZZT:** 7 elements, one per color; the character is stored in the color byte, drawn as text.
- **Cafe:** a single `text` terrain plus `customtext`. Fix (P2): if authored ZZT worlds rely on the 7 color variants, map each to the correct color; otherwise document that cafe collapses them.

---

## Player (4) -- `player-...`

Large custom script (sidebar rendering, hotkeys, input, torch/energizer upkeep). Compare against `ElementPlayerTick` rather than replacing:

- **ZZT per tick:** handle movement/shoot input; if `TorchTicks > 0` decrement (relight surroundings at 0); if `EnergizerTicks > 0` decrement (blink, warn at 10, restore at 0); board time limit damage.
- **Cafe:** does the above via `energized`/`wick`/`torches`, blinking, reload gating; `:shot` ignores damage while `energized > 0`, otherwise health loss.
- **Status:** ok. Invincibility matches ZZT while energized. Treat the cafe player as the intended richer superset (sidebar, FPV turning).

---

## Shared mechanics appendix

- **Damaging/contact (`BoardAttack`)** -- creature deals damage to the player (or is destroyed hitting a player shot). Model as `#send at senderx sendery shot` on adjacency + `#die` on `:shot`, never as a melee projectile. Used by lion, tiger, bear, ruffian, shark, head, segment, star; bullets still use `#shoot` / `ISBULLET`.
- **Push (`ElementPushablePush`)** -- recursive: push the tile ahead first; if the pushed-into tile is a transporter, transport; damage a destructible non-player tile blocking the way; slider axis guard. Boulder/sliders/creatures rely on this.
- **Conveyor rotation** -- 8-neighbor ring shift; only pushable tiles move; stat tiles via `MoveStat`.
- **Bomb blast / torch radius** -- `DrawPlayerSurroundings` uses `TORCH_DX=8, TORCH_DY=5, TORCH_DIST_SQR=50`; the bomb blast damages destructibles within that lit area. Cafe approximates with `within 5`.
- **Board edge / passage transitions** -- engine-owned (`ElementBoardEdgeTouch`, `BoardPassageTeleport`); do not script as element codepages.
- **`bombsmoke` (cafe-only)** -- transient flicker spawned by the bomb blast; not a ZZT element, keep as VFX.

## Suggested fix order

1. **P0 creatures:** done (`pusher`, `head`/`segment` chain, `shark`). Mirrored in coolregionsbow + darkpianoshammer ZTK.
2. **P1 items/interactions:** done -- energizer invincibility (128 vs 75 kept); star/bullet contact damage + score; water/forest; bomb (cycle 12 kept); passage color pairing; transporter landing search; blink-wall ray damage; `:drawdisplay` glyph migration.
3. **P2 terrain/visual:** fake message; text color variants; conveyor stat-tile edge cases; slime polish.
4. **P3:** engine-only ids (empty/edge/message/monitor, blink rays) -- no codepage.

## Verification

Fix the element codepages in the coolregionsbow book, then check behavior against ZZT sources and the existing fixtures:

- **ZZT corpus (real worlds):** `ops/fixtures/zzt/corpus/` -- import/parse/OOP-compile coverage over real ZZT games. Rebuild/refresh via `yarn task run ops:fixtures:zzt:corpus:build` (deps: `:extract`, `:zss`, `:sanitize`); see [`tasks/groups/ops/fixtures/zzt.ts`](../../../../tasks/groups/ops/fixtures/zzt.ts). Use this to confirm imports still map every kind (and that `pusher` now resolves).
- **Lang regression:** Run `yarn task run ops:fixtures:lang:regression:test` ([`tasks/groups/ops/fixtures/lang.ts`](../../../../tasks/groups/ops/fixtures/lang.ts)) after changing any codepage that uses `:drawdisplay` or new commands.
- **Draw-pass unit tests:** `ops/tests/unit/memory/boardoperations.drawpass.test.ts` covers `:drawdisplay` collection/allow-ids -- run the relevant file with `yarn jest <file> --config ops/jest.config.ts --no-coverage` when touching draw logic.
- **Manual in-sim:** load the coolregionsbow library (`loadcoolregionsbowelementlibrary`) and exercise each fixed kind (creature melee/AI, item pickup counts, conveyor/transporter/blink-wall visuals) against ZZT behavior from `ELEMENTS.PAS`.
