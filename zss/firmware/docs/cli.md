# cli.ts

**Purpose**: Defines `CLI_FIRMWARE` — command-line interface commands for system management, book/page operations, export, multiplayer, BBS, and editing tools. Most commands are operator-only.

## Dependencies

- `zss/device/api` — API layer (vm*, bridge*, register*, etc.)
- `zss/device/modem` — modemwriteinitstring
- `zss/feature/rom` — romparse, romprint, romread
- `zss/feature/url` — bbslogin, bbslist, bbsdelete, etc.
- `zss/feature/writeui` — write, writebbar, writeheader, etc.
- `zss/memory/*` — book/page/board/codepage operations

## Command Categories

### Messaging

| Command | Args | Description |
|---------|------|-------------|
| `shortsend` | send spec | Parse short send; if target=’self’ → loader fallback (`cli:label`) |
| `send` | send spec | Parse full send, dispatch to elements |
| `text` | text… | If player: set ticker, log, raise chat event |
| `hyperlink` | label words… | Create hyperlink with player info |
| `stat` | text… | Make scroll with text |
| `help` | — | Open reference scroll |

### Book & Page Management

| Command | Description |
|---------|-------------|
| `bookrename` | Rename main book (operator) |
| `booktrash` | Delete book by address (operator) |
| `pages` | List pages in open book(s) |
| `pageopen` | Open code editor for page; writes modem init string |
| `pagetrash` | Delete page from main book (operator) |
| `books` | List books |
| `boards` | List boards |
| `boardopen` | Teleport player to board by stat |
| `trash` | Show trash menu (books + pages) |

### Game State

| Command | Description |
|---------|-------------|
| `dev` | Halt execution (operator) |
| `share` | Share game (operator) |
| `save` | Flush (operator) |
| `fork` | Fork to new address (operator) |
| `nuke` | Nuke game (operator) |
| `endgame` | Logout |
| `restart` | Restart game (operator) |

### Export

| Command | Description |
|---------|-------------|
| `export` | Show export menu |
| `bookexport` | Show book export options |
| `bookallexport` | Download full book JSON |
| `pageexport` | Download page JSON |
| `itchiopublish` | Publish to Itch.io |

### Editing

| Command | Description |
|---------|-------------|
| `gadget` | Toggle inspector |
| `findany` | Find elements at points (optional selection) |

### Discovery

| Command | Args | Description |
|---------|------|-------------|
| `zztsearch` | [field] text | Search ZZT worlds |
| `zztrandom` | — | Get random ZZT world |

### Multiplayer

| Command | Args | Description |
|---------|------|-------------|
| `admin` | — | Open admin panel |
| `joincode` | [hidden] | Start multiplayer (operator) |
| `jointab` | [hidden] | Join via tab |
| `chat` | [channel] | Start/stop chat |
| `broadcast` | [streamkey] | Start/stop stream |

### BBS (Bulletin Board System)

| Command | Args | Description |
|---------|------|-------------|
| `bbs` | … | Login flow: `#bbs <email> <tag>`, then `#bbs <code>`. Subcommands: `restart`, `list`, `pub`/`publish`, `del`/`delete` |

### Agent

| Command | Args | Description |
|---------|------|-------------|
| `agent` | [action] [args…] | start, stop &lt;id&gt;, list, or prompt &lt;id&gt; &lt;prompt&gt; |

## Internal State

- `bbscode`, `bbsemail` — BBS login state (module-level)
- `isoperator` — Checks if player === memoryreadoperator()
- `vmflushop` — Flushes VM for operator
