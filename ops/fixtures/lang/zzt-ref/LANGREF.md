# ZZT-OOP Programming Language — Reference Manual

Source: [RoZZT `DOC/LANGREF.HLP`](https://github.com/asiekierka/reconstruction-of-zzt/blob/master/DOC/LANGREF.HLP) (MIT).

## Program format

Besides direct commands, ZZT-OOP programs contain statements with these line-start symbols:

| Symbol | Meaning |
|--------|---------|
| `@objectname` | On the **first line** of an object, names it for `#send` targeting |
| `#command` | Programming language command (first non-whitespace on line) |
| `/direction` | Move; blocks until free |
| `?direction` | Try move; ignored if blocked |
| `:label` | Message handler entry point |
| `'comment` | Comment / deactivated label |
| text | Display line (scroll or one-line flash message) |
| `!msg;text` | Hyperlink button in scroll text |

## Messages

Objects exchange messages with themselves, other objects, and the board.

Built-in messages: `touch`, `shot`, `bombed`, `thud`, `energize`.

## Directions

`n`/`north`, `s`/`south`, `e`/`east`, `w`/`west`, `i`/`idle`, `seek`, `flow`, `rndns`, `rndne`, `cw`, `ccw`, `rndp`, `opp`.

## Flags

`#set`, `#clear`, `#if [flag] [then message]`.

Internal flags: `aligned`, `contact`, `blocked`, `energized`.

## Commands (ZZT 3.2)

All commands are introduced with `#`:

| Command | Summary |
|---------|---------|
| `#become` | Change object into terrain/creature; program ends |
| `#bind` | Replace program with another object's code |
| `#change` | Transform board elements |
| `#char` | Change displayed character (0–255) |
| `#clear` | Clear a flag |
| `#cycle` | Set update speed (1–255, default 3) |
| `#die` | Remove object |
| `#end` | Halt until next message |
| `#endgame` | End the game |
| `#give` | Give player ammo/gems/torches/health/score |
| `#go` | Move in direction (blocks) |
| `#idle` | Wait one cycle |
| `#if` | Conditional send (`#if flag then label`) |
| `#lock` / `#unlock` | Ignore / accept messages |
| `#play` | Background music |
| `#put` | Place item adjacent |
| `#restart` | Restart program from top |
| `#restore` | Restore zapped label |
| `#send` | Jump to label (`#send label`, `#send obj:label`, `#send all:msg`) |
| `#set` | Set flag |
| `#shoot` | Fire bullet |
| `#take` | Take item from player (optional fail label) |
| `#throwstar` | Throw star |
| `#try` | Move or send on block |
| `#walk` | Continuous walk (`#walk i` to stop) |
| `#zap` | Deactivate first matching label |

See RoZZT LANGREF for full prose and examples per command.
