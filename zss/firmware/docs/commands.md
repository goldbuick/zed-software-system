# Full command reference

All firmware commands and their descriptions. Commands are available depending on driver (CLI, RUNTIME, LOADER) and which firmware modules are registered.

---

## CLI

| Command | Description |
|---------|-------------|
| `shortsend` | Message (short form, no target keyword needed) |
| `send` | Message to target elements |
| `stat` | Text in a scroll window |
| `text` | Text on element or in sidebar |
| `hyperlink` | Clickable link in scroll or log |
| `bookrename` | The main book (operator only) |
| `booktrash` | A book by address (operator only) |
| `boardopen` | To move player to board |
| `pageopen` | A code page editor |
| `pagetrash` | A code page (operator only) |
| `help` | Help scroll |
| `books` | All books |
| `pages` | All pages in all loaded books |
| `boards` | All boards as goto hyperlinks |
| `trash` | Books/codepages to delete (operator only) |
| `dev` | Dev mode / halt execution (operator only) |
| `loaderlogging` | Toggle loader event logging (operator only) |
| `promptlogging` | Toggle agent system prompt logging (operator only) |
| `share` | Share url (operator only) |
| `save` | And persist current state (operator only) |
| `fork` | Tab with copy of state (operator only) |
| `nuke` | A countdown and reloads into an empty state (operator only) |
| `endgame` | Health to 0 |
| `restart` | Software, deletes all chip and player state (operator only) |
| `export` | Export menu (operator only) |
| `bookexport` | Book export options (operator only) |
| `bookallexport` | Entire book as JSON (operator only) |
| `pageexport` | Code page as JSON (operator only) |
| `itchiopublish` | Zip file for itch.io (operator only) |
| `gadget` | Built-in inspector |
| `findany` | Matched elements |
| `zztsearch` | ZZT content by field and text |
| `zztrandom` | Random ZZT content |
| `admin` | Admin scroll |
| `joincode` | Multiplayer session (operator only) |
| `jointab` | New tab with the join url (operator only) |
| `chat` | Twitch chat integration (operator only) |
| `broadcast` | Stream broadcast (operator only) |
| `permissions` | List player→role and role→command |
| `allow` | Add command(s) to role allowlist |
| `revoke` | Remove command from role or revoke all |
| `role` | Set player token to role |
| `agent` | start/stop/list AI agents; prompt agents via in-world chat only |
| `screenshot` | Screenshot for capture |
| `bbs` | Login/publish actions |

---

## Runtime

| Command | Description |
|---------|-------------|
| `endgame` | Health to 0 |
| `shortsend` | Message (short form, no target keyword needed) |
| `send` | Message to target elements |
| `stat` | Text in a scroll window |
| `text` | Text on element or in sidebar |
| `hyperlink` | Clickable link in scroll or log |
| `help` | Help scroll |

---

## Loader

| Command | Description |
|---------|-------------|
| `endgame` | Health to 0 (no-op in loaders) |
| `shortsend` | Message (short form, no target keyword needed) |
| `send` | Message to target elements |
| `stat` | Text in a scroll window |
| `text` | Text on element or in sidebar |
| `hyperlink` | Clickable link in scroll or log |
| `readline` | Text data |
| `readjson` | JSON data |
| `readbin` | Binary data |
| `withboard` | To target board by id, name, or stat |
| `withobject` | To target object id |
| `userinput` | User input actions (up/down/left/right/etc) |

---

## Element

| Command | Description |
|---------|-------------|
| `clear` | Variables (set to 0) |
| `set` | Variable to value |
| `become` | Element into specified kind |
| `bind` | Code from named element |
| `char` | Character (self or at direction) |
| `color` | Color (self or at direction) |
| `go` | Element in direction |
| `walk` | Cause element to move in direction each tick |
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
| `array` | Array variable |
| `read` | Property from object into variable |
| `toast` | Toast notification |
| `ticker` | Element ticker text |

---

## Board

| Command | Description |
|---------|-------------|
| `build` | Create board and link to stat. Optional source board. |
| `goto` | Player to board by name or address with optional x, y |
| `transport` | Element across board with transporter logic |
| `shove` | Target object in direction |
| `push` | Target object in direction ONLY if pushable |
| `duplicate` | Element at direction in given direction |
| `duplicatewith` | Element with argument |
| `dupe` | Element at direction in given direction |
| `dupewith` | Element with argument |
| `write` | Text to board at direction |
| `change` | Elements of one kind to another |
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
| `snapshot` | Board snapshot |
| `revert` | Board to snapshot state |
| `copy` | Region from source to current board |
| `remix` | From source with pattern size and mirror to current board |
| `weave` | Board elements in direction |
| `pivot` | Board elements by degrees |

---

## Network

| Command | Description |
|---------|-------------|
| `fetch` | URL with label, method, and optional data |
| `fetchwith` | URL with argument, label, method, and optional data |

---

## Audio

| Command | Description |
|---------|-------------|
| `ttsengine` | List TTS engines (no args) or set engine and config |
| `tts` | Text with voice (or clear queue) |
| `ttsqueue` | TTS phrase |
| `bpm` | BPM |
| `vol` | Main volume |
| `bgvol` | Bgplay volume |
| `ttsvol` | TTS volume |
| `play` | Music notes |
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
