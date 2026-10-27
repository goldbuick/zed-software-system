---
title: Full command reference
---

All firmware commands and their descriptions. Which commands are available depends on the driver and on which firmware modules are registered.

## By driver

- [CLI commands](/firmware/commands/cli) -- what you type in the terminal: books, pages, save, export, multiplayer, chat, permissions, ZNS
- [Runtime commands](/firmware/commands/runtime) -- extra commands codepages use while boards run
- [Loader commands](/firmware/commands/loader) -- reading text, JSON, and binary data and targeting boards and objects during import

The tables below are the shared commands every driver gets.

---

## Element

| Command | Description |
|---------|-------------|
| `clear` | Variables (set to 0), or drop an array index |
| `set` | Variable to value |
| `become` | Element into specified kind |
| `morph` | Drop code/kinddata, set kind (object source; object or terrain target) |
| `bind` | Code from named element |
| `char` | Character (self or at direction); cross-board dirs resolve against live MEMORY on the sim |
| `color` | Color (self or at direction); cross-board dirs resolve against live MEMORY on the sim |
| `go` | Element in direction |
| `walk` | Cause element to move in direction each tick, or capture deltas into names |
| `idle` | Execution until next tick |
| `end` | Program (optionally set 'arg' variable) |
| `lock` | Against external messages |
| `restore` | All labels of given name |
| `unlock` | Against messages from others |
| `zap` | Activate first label of given name |
| `cycle` | Element cycle value (1-255) |
| `die` | Element (halt execution unless @isitem) |
| `run` | Object codepage of given name |
| `runwith` | Function with argument |
| `array` | Array variable; plain array values are spread |
| `read` | Property from object into variable |
| `pset` | Attr on dir (Weave-like; `step`/`shoot` set axes; `light <n> [dir]` sets radius/cone) |

---

## Board

| Command | Description |
|---------|-------------|
| `build` | Create board via `boardbuild` on the sim and link to stat. Optional source board; exit\* bidirectional; standard element stats on object, else player flags. Missing source/element fails loud. |
| `goto` | Teleport player via `memorymoveplayertoboard` — board by name or address with optional x, y |
| `transport` | Element across board with transporter logic |
| `shove` | Target object in direction |
| `push` | Target object in direction ONLY if pushable (at most once per tick) |
| `duplicate` | Element at direction in given direction |
| `duplicatewith` | Element with argument |
| `dupe` | Element at direction in given direction |
| `dupewith` | Element with argument |
| `write` | Text to board at direction |
| `change` | Elements matching a group (or kind name via listing) to another kind |
| `put` | Element in direction |
| `putwith` | Element with argument |
| `oneof` | Given id to ensure only one element of given kind is made |
| `oneofwith` | Element with argument and oneof logic |
| `shoot` | Projectile, with optional kind |
| `shootwith` | Projectile with argument |
| `throwstar` | Star projectile, shorthand for `#shoot \<dir\> star` |
| `throwstarwith` | Star with argument |

---

## Transforms

| Command | Description |
|---------|-------------|
| `snapshot` | Board snapshot via `boardsnapshot` on the sim |
| `revert` | Board to snapshot state via `boardrevert` on the sim |
| `weave` | Board elements in direction |
| `copy` | Region from source to current board |
| `remix` | From source with pattern size and mirror to current board |
| `pivot` | Board elements by degrees |

---

## Network

| Command | Description |
|---------|-------------|
| `fetch` | URL with label, method, and optional data |
| `fetchwith` | URL with argument, label, method, and optional data |

### Bridge chat (Twitch, feeds)

- **Route key:** `routekey` is the suffix for VM loader events:
  - `chat:message:<routekey>`
  - `chat:action:<routekey>`
  - `chat:connect:<routekey>`
  - `chat:disconnect:<routekey>`
  - `chat:roster:<routekey>` (speaker idle list; body lines are `name:seconds`, no space after the colon)
- **Message / action body:** `name|voice:text` (always includes `|`; empty voice is fine: `alice|:hello`). `#set voice <number|string>` supplies the voice field for in-session players; bridge/Twitch leave it empty. `:`, `|`, and newlines are stripped from name and voice at emit time so loaders can `#readline "(.*?)\|(.*?):(.*)"`.
- **Reserved routekey `player`:** in-session players (not a Twitch channel). `#text` from a player emits `chat:message:player` (not the board id). Login/logout emit `chat:connect:player` / `chat:disconnect:player` and refresh `chat:roster:player`. Match loaders with `@event ^chat:message:player`, `@event ^chat:roster:player`, etc.
- **Twitch / feeds:** keep their own routekey (`chat:roster:mychannel`, …). Roster tracks speakers who recently messaged or acted; idle entries older than 3600s are dropped; disconnect clears the roster and emits an empty body.
- **Twitch:** `#chat <channel>` or `#chat <channel> twitchtoken=<token>` (the same key on `#chat start twitch`) joins as that user. The token is a user access token with `chat:edit`; a leading `oauth:` is stripped. `#chat say <text>` posts that text when the connection can speak. Do not commit tokens. Message text keeps http(s) URLs after emote strip (loaders may `#media` them). TTS strips URLs at speak time via `cleantextfortts`, not at chat ingest.
- **Status:** `#bridge` or `#bridge status` prints chat slot state and IVS broadcast summary **without** secrets.
- **Saved profiles (IndexedDB):** `#chat profile` (same as `#chat profile list`) prints profile names; `#chat profile show <name>` prints one profile (secrets redacted); `#chat profile save …` / `#chat profile delete <name>` manage them. Use `#chat start <kind> @profilename` to apply a profile.

---

## Audio

| Command | Description |
|---------|-------------|
| `ttsengine` | List TTS engines (no args) or set engine and config |
| `tts` | Text with voice (or clear queue) |
| `ttsqueue` | TTS phrase |
| `vol` | Main volume (scales play, bgplay, TTS, media) |
| `playvol` | Play volume |
| `bgvol` | Bgplay volume |
| `ttsvol` | TTS volume |
| `mediavol` | Board TV volume |
| `play` | Music notes; voices 5-8 bleed onto the four #bgplay channels |
| `bgplay` | #play but for sound effects |
| `bgplayon64n` | Bgplay on 64n |
| `bgplayon32n` | Bgplay on 32n |
| `bgplayon16n` | Bgplay on 16n |
| `bgplayon8n` | Bgplay on 8n |
| `bgplayon4n` | Bgplay on 4n |
| `bgplayon2n` | Bgplay on 2n |
| `bgplayon1n` | Bgplay on 1n |
| `synth` | All 4 channels of #play synth voices |
| `synthrecord` | Played note buffer to an mp3 file |
| `synthflush` | Buffer of played notes |
| `echo` | Echo effect to all 4 channels of #play |
| `fcrush` | Frequency crush to all 4 channels of #play |
| `autofilter` | Autofilter to all 4 channels of #play |
| `reverb` | Reverb to all 4 channels of #play |
| `distort` | Distortion to all 4 channels of #play |
| `vibrato` | Vibrato to all 4 channels of #play |
| `autowah` | Autowah to all 4 channels of #play |
| `synth1` | Synth voice 1 |
| `synth2` | Synth voice 2 |
| `synth3` | Synth voice 3 |
| `synth4` | Synth voice 4 |
| `synth5` | #bgplay synth voices |
| `echo1` | For first 2 channels of #play |
| `echo2` | For last 2 channels of #play |
| `echo3` | For #bgplay |
| `echo4` | For #tts |
| `fcrush1` | Crush for first 2 channels of #play |
| `fcrush2` | Crush for last 2 channels of #play |
| `fcrush3` | Crush for #bgplay |
| `fcrush4` | Crush for #tts |
| `autofilter1` | For first 2 channels of #play |
| `autofilter2` | For last 2 channels of #play |
| `autofilter3` | For #bgplay |
| `autofilter4` | For #tts |
| `reverb1` | For first 2 channels of #play |
| `reverb2` | For last 2 channels of #play |
| `reverb3` | For #bgplay |
| `reverb4` | For #tts |
| `distort1` | For first 2 channels of #play |
| `distort2` | For last 2 channels of #play |
| `distort3` | For #bgplay |
| `distort4` | For #tts |
| `vibrato1` | For first 2 channels of #play |
| `vibrato2` | For last 2 channels of #play |
| `vibrato3` | For #bgplay |
| `vibrato4` | For #tts |
| `autowah1` | For first 2 channels of #play |
| `autowah2` | For last 2 channels of #play |
| `autowah3` | For #bgplay |
| `autowah4` | For #tts |
