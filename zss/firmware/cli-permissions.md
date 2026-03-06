# Command permissions design: operator-controlled command access

## Goal

The operator controls which **commands** logged-in players can run. The operator keeps full access; other players are restricted by operator-defined **roles** and **allowlists**. One permission layer applies to all drivers (CLI, LOADER, RUNTIME).

## Current behavior

- **Operator** is the single player id in `memoryreadoperator()` (set at session start).
- **Operator-only commands** (20 in `zss/firmware/cli.ts`) use `isoperator(READ_CONTEXT.elementfocus)`; all other commands are runnable by any player in context. There is no per-player or per-role allow/deny today.

## Design principles

1. **Single enforcement point** — Check permissions in one place for all drivers so behavior is consistent.
2. **Operator always allowed** — Operator bypasses permission checks for all commands and drivers.
3. **Persisted in storage** — Permissions are stored in the same storage layer used for netterminal peerid (e.g. IndexedDB / node storage), not in the book. They therefore carry over across sessions and software runs; you do not need to rebuild permissions when starting new software.
4. **Token-based identity** — Permissions are keyed by a stable fingerprint token (per browser/device), not by ephemeral player id, so the same device keeps the same permissions across sessions and reconnects. The token can be derived deterministically from device/browser attributes so that it regenerates the same value even if the user clears localStorage.
5. **Naming** — Variable names and method names are all lowercase with no underscores (e.g. `playertotoken`, `allowlistbyrole`). Constants are ALL_CAPS.
6. **Roles** — Permission checks use **roles** (Operator > Admin > Mod > Player, strict order). Each command declares a **required role** in firmware command metadata. The operator assigns **permissions (allowlist) to a role**, then assigns **players (tokens) to that role** for access.

---

## 1. Fingerprint token

**Purpose:** Player ids can change between sessions or reconnects. A **fingerprint token** identifies the browser/device. Permissions are keyed by **role** (allowlist by role, token → role); at runtime we resolve player id → token, then the token’s role and that role’s allowlist.

**Token generation: deterministic fingerprint**

We use a **deterministic fingerprint**: derive the token from stable browser/device attributes (e.g. user agent, screen resolution, timezone, language, hardware concurrency, or a hash of a small set of such values). The same device always produces the same token, so clearing localStorage does not change the token — we recompute it on load. Permissions keyed by this token therefore survive localStorage clears. Tradeoff: fingerprinting can be a privacy concern; the token may change if the user changes browser or significant device settings.

**Client (browser):**

- On load: compute the deterministic fingerprint from device/browser attributes (same inputs → same token every time). Optionally cache in localStorage; if cleared, recompute and get the same token.
- After **acklogin** (register's acklogin message handler), send the token to the backend/VM so the session can associate the current player id with that token.

**Lookup table (in memory / session):**

- **playerid → token:** When we receive a player’s token (after acklogin), set `playertotoken[playerid] = token`. So for the rest of the session we can resolve “who is this player?” to “what token are they using?”.
- Optionally **token → playerid(s)** for “which players are currently using this token?” (e.g. for admin display).

**Permission storage:**

- **Allowlist by role, token by role:** Permissions (allowlist) are assigned to a **role**; players (tokens) are assigned to a **role**. So a token gets its effective allowlist from `allowlistbyrole[rolebytoken[token]]`.

**Operator workflow:**

- Operator assigns commands to a **role**: `#allow <role> <command>` (add command to that role's allowlist). Operator assigns a **player** to a **role**: `#role <player> <role>` (resolve player to token, set `rolebytoken[token] = role`).

**Summary:**

| Item | Where | Notes |
|------|--------|------|
| Token generation | Client | Deterministic fingerprint (recompute on load; stable across localStorage clear). |
| Token storage | Client | Optional localStorage cache; token can be recomputed without it. |
| Sending token | Client → VM/register | After **acklogin** so session knows player’s token. |
| Lookup | Session/memory | `playerid → token`; updated when we see a player’s token (acklogin). |
| Permissions | Session/memory | **allowlist by role**, **token → role**; operator assigns allowlist to role, then assigns player to role. |

---

## 2. Enforcement point

**Where:** In `zss/chip.ts`, inside `invokecommand(command, args)`, for **every** driver (CLI, LOADER, RUNTIME). No branch on driver type. Use **READ_CONTEXT** for the current element and focus.

**When to check:** Apply the permission check **only when `READ_CONTEXT.elementisplayer === true`**. When `elementisplayer` is false (e.g. a board element running code, not a human player), skip the check and allow the command to run as today.

**What:** When `READ_CONTEXT.elementisplayer` is true, before invoking the firmware handler, call `memorycanruncommand(READ_CONTEXT.elementfocus, command)`. If it returns false, return `0` and optionally notify (e.g. "Permission denied").

**Logic:** See §4 (permission flow) and §6 (pseudocode). In short: operator → allow; else resolve player → token, check token’s role vs command’s required role, then check command in that role’s allowlist.

---

## 3. Data model

**Session (in memory):** `playertotoken: Record<string, string>` — player id → token; populated when the client sends its token after acklogin.

**In storage** (same mechanism as netterminal peerid; use `storagereadvars` / `storagewritevar` with keys `allowlistbyrole`, `rolebytoken`). Permission data is **read on the client** and sent to the VM when needed; the VM does not read storage directly. Survives reloads, reconnects, and new software runs; not tied to the book.

```ts
type commandpermissions = {
  allowlistbyrole: Record<string, Set<string>>   // role → commands; empty = none allowed for that role
  rolebytoken: Record<string, string>            // token → role (admin | mod | player); operator by player id, not here
}
```

**Serialization:** `allowlistbyrole` values stored as arrays (e.g. `["send", "text"]`), deserialized to `Set` on load. **Command required role:** from firmware metadata via `firmwaregetcommandrequiredrole(command)` (§4).

---

## 4. Roles and permission flow

**Hierarchy (strict order):** Operator > Admin > Mod > Player. Operator is identified by player id (`memoryreadoperator()`), not by token. All other tokens get a role via `rolebytoken` (default **player** if missing).

| Role        | Meaning |
|-------------|--------|
| **Operator**  | Bypasses all checks. |
| **Admin**     | Can run commands that require Admin, Mod, or Player. |
| **Mod**       | Can run commands that require Mod or Player. |
| **Player**    | Can run commands that require Player. |

**Command metadata:** Each firmware command has a **required role** in its metadata: `operator` | `admin` | `mod` | `player`. The permission layer requires token's role ≥ command's required role (via `rolemeets()`).

**Allowlist:** Operator assigns an allowlist to each **role** (`allowlistbyrole`) and assigns each **token** to a role (`rolebytoken`). A token's effective allowlist is `allowlistbyrole[rolebytoken[token]]`. Empty allowlist for a role = no commands allowed for that role.

**Permission flow:**

1. If `player === memoryreadoperator()` → allow.
2. Else `token = playertotoken[player]`; if no token → deny and `apierror()`.
3. `tokenrole = rolebytoken[token] ?? 'player'`; `requiredrole = firmwaregetcommandrequiredrole(command)`; if `!rolemeets(tokenrole, requiredrole)` → deny and `apierror()`.
4. Else `allowlist = allowlistbyrole[tokenrole]`; if missing or empty → deny; else allow only if `allowlist.has(command)`.

---

## 5. Operator CLI (v1)

All of the following are operator-only (enforced by the same permission layer):

- **`#permissions`** — Output two lists: **player → role** (each player/token and their assigned role), and **role → command** (each role and its allowlist). When no player has sent a token yet, show only the **role → command** list.
- **`#allow <role> <command>`** — Add command(s) to that role's allowlist. Multiple commands: `#allow <role> <cmd1> <cmd2> ...`
- **`#revoke <role> <command>`** — Remove command from that role's allowlist.
- **`#revoke <role> all`** — Clear that role's allowlist (no commands allowed).
- **`#role <player> <role>`** — Resolve player to token (after acklogin), set `rolebytoken[token] = role`.

Role names are **operator**, **admin**, **mod**, **player** (no aliases; use these exact names in CLI).

**Deferred:** Admin panel (not v1). **Future:** `#allow <token> <command>` for assigning by token when the same device rejoins with a new player id.

---

## 6. Permission logic (pseudocode)

```text
function memorycanruncommand(player: string, command: string): boolean {
  const operator = memoryreadoperator()
  if (player === operator) return true

  const token = playertotoken[player]
  if (token === undefined) {
    apierror(SOFTWARE, player, 'permissions', 'no token (deny)')
    return false
  }

  const requiredrole = firmwaregetcommandrequiredrole(command)   // from command metadata
  const tokenrole = permissions.rolebytoken[token] ?? 'player'
  if (!rolemeets(tokenrole, requiredrole)) {
    apierror(SOFTWARE, player, 'permissions', 'role insufficient')
    return false
  }

  const allowlist = permissions.allowlistbyrole[tokenrole]   // allowlist is by role
  if (allowlist === undefined || allowlist.size === 0)
    return false   // empty allowlist = no commands allowed for that role

  return allowlist.has(command)
}

// Strict order: operator > admin > mod > player
function rolemeets(tokenrole: string, requiredrole: string): boolean { ... }
```

See §3 for data shapes and §4 for the permission flow. If the player is not in `playertotoken` yet, **deny** and log via `apierror()`; see §8 (edge cases).

---

## 7. Implementation checklist

- [x] **Loaderlogging toggle** — Replace `storagereadconfig('loaderlogging')` in `vm.ts` with an in-memory toggle like **#dev** mode: add a CLI command (e.g. `#loaderlogging`) that toggles a flag in memory (e.g. `memoryreadloaderlogging()` / `memorywriteloaderlogging()` in `zss/memory`), and have the VM read that flag instead of storage. No storage config for loaderlogging.
- [x] **Config in admin menu (no storage in utilities)** — Remove use of `storagereadconfigall`, `storagereadconfigdefault`, and `storagewriteconfig` from `zss/memory/utilities.ts`. Register sends current config values to the client/VM (e.g. at login or when opening admin). When the user changes a config in the admin menu, the update is sent to register; register writes the new value to storage. Utilities only render and emit changes; it does not read or write storage.
- [ ] **Fingerprint token (client)** — Compute deterministic fingerprint; send token after **acklogin**. Session stores player id → token.
- [ ] **Lookup** — Maintain `playertotoken` in memory; update in register **acklogin** handler when client sends token.
- [ ] **Command metadata** — Required role per command in firmware (`operator` | `admin` | `mod` | `player`); expose `firmwaregetcommandrequiredrole(command)`; strict order operator > admin > mod > player.
- [ ] **Permission data** — `allowlistbyrole`, `rolebytoken`; persist in **storage** via existing `storagereadvars` / `storagewritevar` with keys `allowlistbyrole`, `rolebytoken`. Permission data is **read on the client** and sent to the VM when needed (VM does not read storage directly). Serialize allowlists as arrays, deserialize to `Set`. Default role `player` for unknown token; empty allowlist = no commands for that role.
- [ ] **Enforcement** — In `zss/chip.ts` `invokecommand()`, use READ_CONTEXT; **only when `READ_CONTEXT.elementisplayer === true`** call `memorycanruncommand(READ_CONTEXT.elementfocus, command)`; if false, return 0 and `apierror()`. When `elementisplayer` is false, skip the check.
- [ ] **Operator CLI** — `#permissions`, `#allow <role> <command>`, `#revoke <role> <command>`, `#role <player> <role>` in `zss/firmware/cli.ts` (operator-only); role names: operator, admin, mod, player (no aliases).
- [ ] **Docs** — Roles, allowlist-by-role, permission commands.
- [ ] **Admin UI** — Deferred (not v1).

---

## 8. Edge cases

| Case | Behavior |
|------|----------|
| Unknown command | Existing "command not found" / fallback. |
| Player not in `playertotoken` | Deny; log `apierror(SOFTWARE, player, 'permissions', 'no token (deny)')`. |
| Token not in `rolebytoken` | Default role **player**. |
| Role missing or empty in `allowlistbyrole` | No commands allowed for that role. |
| Operator | By player id; bypass does not require operator token in table. |
| READ_CONTEXT.elementisplayer false | Skip permission check; allow (e.g. board element running code). |
| localStorage cleared | Same token recomputed (deterministic fingerprint); permissions unchanged. |

---

## 9. Summary

| Item | Choice |
|------|--------|
| Enforcement | `chip.ts` `invokecommand()`; only when **READ_CONTEXT.elementisplayer** call `memorycanruncommand(READ_CONTEXT.elementfocus, command)`; else skip check |
| Roles | Operator > Admin > Mod > Player (strict); required role per command in firmware |
| Model | Allowlist by role; token → role; empty allowlist = no commands for that role |
| Identity | Token (deterministic fingerprint); `playertotoken` after acklogin |
| Storage | `allowlistbyrole`, `rolebytoken` in storage (like netterminal peerid); arrays → `Set`; cross-session |
| Operator CLI | `#permissions` (player→role, role→command; when no players: role→command only); `#allow` / `#revoke` / `#role` (roles: operator, admin, mod, player); admin panel deferred |

---

## Decisions (resolved)

| # | Question | Decision |
|---|----------|----------|
| 1 | Token strategy | **Deterministic fingerprint** for v1. |
| 2 | Player not in playertotoken | **Deny** and log via `apierror()`. |
| 3 | When to send token | After **acklogin** (register's acklogin message handler). |
| 4 | Persistence format | **Storage** (same layer as netterminal peerid); not in the book. Permissions carry over across sessions and software runs. |
| 5 | Command permission source | **Firmware command metadata** (required role per command). |
| 6 | Admin panel | **Explicitly deferred** (not v1). |
| 7 | Roles | **Operator** > **Admin** > **Mod** > **Player** (strict order); required role per command in firmware metadata. |
| 8 | Permissions model | Assign **permissions to a role** (allowlistbyrole), then **assign player to that role** (rolebytoken). |
| 9 | Empty allowlist | **No commands allowed** for that role. |
| 10 | Fingerprint | Keep it simple; no constraints. |
| 11 | Storage keys | **`allowlistbyrole`**, **`rolebytoken`** in storage (same mechanism as netterminal peerid). |
| 12 | Role names in CLI | **operator**, **admin**, **mod**, **player** (no aliases; use these names). |
| 13 | Default role for new tokens | **Player** (token with no `rolebytoken` entry). |
| 14 | `#permissions` output | Two lists: **player → role**, and **role → command**. |
| 15 | Missing role in allowlistbyrole | **No commands allowed** for that role (document for operators). |
| 16 | Set serialization | In storage: persist `allowlistbyrole` values as **arrays**; deserialize to `Set`. |
| 17 | Storage API | Use existing **`storagereadvars`** / **`storagewritevar`** with keys `allowlistbyrole` and `rolebytoken` (no dedicated permission helpers). |
| 18 | Where permission data is read | **Client only**; read on the client and send to the VM when needed (VM does not read storage directly). |
| 19 | Role name | Use **mod** as the role name (not "moderator"); no aliases. Roles: operator, admin, mod, player. |
| 20 | `#permissions` when no players | Show only the **role → command** list. |
| 21 | Migration | **Greenfield**; no legacy data to migrate. |
| 22 | When to apply check | Use **READ_CONTEXT**; apply permission check **only when READ_CONTEXT.elementisplayer === true**. When false, skip check. |