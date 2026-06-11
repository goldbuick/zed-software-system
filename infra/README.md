# Infra workers

Cloudflare Workers in this folder back public `*.zed.cafe` services used by the client (`zss/feature/url.ts`, net terminal `#zns`, share links, Museum of ZZT proxy).

| Worker | Source | Production host |
|--------|--------|-----------------|
| ZNS | `net-zns-worker.js` | `zns.zed.cafe`, `*.{namespace}.at.zed.cafe` |
| Bytes | `net-bytes-worker.js` | `bytes.zed.cafe` |
| Brick | `net-brick-worker.js` | `brick.zed.cafe` |
| Terminal | `net-terminal-worker.js` | `terminal.zed.cafe` |

Client-side wrappers and constants live in [`zss/feature/url.ts`](../zss/feature/url.ts). See also [`zss/feature/docs/url.md`](../zss/feature/docs/url.md).

---

## ZNS (`net-zns-worker.js`)

Email + OTP login, namespace claim, long-lived token, and per-namespace key/value pairs stored in KV.

### Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `ZNS_APEX` | `zns.zed.cafe` | Apex hostname for API routes |
| `ZNS_TENANT_SUFFIX` | `at.zed.cafe` | Hostname suffix for tenant reads (`{namespace}.{suffix}`) |
| `BYTES_ORIGIN` | `https://bytes.zed.cafe` | Redirect target for bytes pairs |
| `JOIN_ORIGIN` | `https://zed.cafe` | Redirect target for `peer` pairs |
| `RESEND_API_KEY` | — | Sends OTP email (`#zns {code}` subject) |
| `zns` | — | KV namespace binding |

### Apex API (`https://zns.zed.cafe`)

All routes are `POST` with `multipart/form-data`. Responses are JSON unless noted. CORS allows `GET, POST` from any origin.

#### `POST /api/login`

Start OTP login and reserve a namespace for the email.

| Field | Required | Notes |
|-------|----------|-------|
| `email` | yes | Lowercased/trimmed |
| `namespace` | yes | `[a-z0-9-]`, 1–63 chars; reserved: `www`, `api`, `mail`, `ftp` |

**200** `{ "success": true }` — OTP emailed.

**403** namespace owned by another account, or email already bound to a different namespace.

**502** email send failure.

#### `POST /api/code`

Verify OTP and issue a long-lived token.

| Field | Required |
|-------|----------|
| `email` | yes |
| `code` | yes | Six digits from login email |

**200** `{ "success": true, "token": "<64-char hex>" }`

**403** no pending login, wrong code, or namespace conflict.

#### `POST /api/set`

Create or update a key in the caller's namespace. Requires valid `email` + `token`.

| Field | Required | Notes |
|-------|----------|-------|
| `email` | yes | |
| `token` | yes | |
| `key` | yes | Path segment only (no `/`); `[a-z0-9-]`, 1–63 chars |
| `value` | yes | Interpreted by kind (see below) |

Value kinds (auto-detected unless key is `peer`):

| Kind | When | Stored value |
|------|------|--------------|
| `peer` | `key` is `peer` | PeerJS id (`[a-zA-Z0-9_-]{4,256}`) |
| `bytes` | Value is a bytes hash or `https://bytes.zed.cafe/{hash}` | 8–96 char `[A-Za-z0-9]` hash |
| `text` | Anything else | Markdown/plain text, max 512 KiB |

**200** `{ "success": true }`

#### `POST /api/list`

List all keys in the caller's namespace.

| Field | Required |
|-------|----------|
| `email` | yes |
| `token` | yes |

**200** `{ "success": true, "list": [{ "key", "value", "metadata" }, ...] }`

#### `POST /api/delete`

Delete one key.

| Field | Required |
|-------|----------|
| `email` | yes |
| `token` | yes |
| `key` | yes |

**200** `{ "success": true }`

### Tenant reads (`https://{namespace}.at.zed.cafe/{key}`)

Public `GET` / `HEAD` only. `{key}` is the first path segment (lowercased). Mixed-case hosts (e.g. `WiL.at.zed.cafe`) redirect **301** to the lowercase canonical URL (`wil.at.zed.cafe`).

| Kind | Response |
|------|----------|
| `text` | **200** body as `text/markdown`; `Cache-Control: public, max-age=60` |
| `peer` | **302** to `{JOIN_ORIGIN}/join/#{peerId}` |
| `bytes` | **302** to `{BYTES_ORIGIN}/{hash}` |

**404** if key missing or invalid.

Example: `docs.at.zed.cafe/algoscroll` serves seeded refscroll markdown for gadget docs fallback.

---

## Bytes (`net-bytes-worker.js`)

Short-link service for Zed share URLs. Keys are `{4 random letters}{4 base36 time chars}` (see ZNS bytes validation).

### Environment

| Variable | Purpose |
|----------|---------|
| `kv` | KV namespace binding |

### Routes (`https://bytes.zed.cafe`)

CORS allows `GET, POST` from any origin.

#### `POST /`

Create a redirect. Body: `multipart/form-data`.

| Field | Required | Notes |
|-------|----------|-------|
| `url` | yes | Must start with `https://zed.cafe/` or `https://localhost:7777/` |
| `book` | no | Stored in KV metadata |

**200** response body is the full short URL, e.g. `https://bytes.zed.cafe/aBcD1x2y`.

**401** `unauthorized` if `url` origin is not allowed.

**200** `try again` if generated key collides (retry).

#### `DELETE /`

Remove a redirect.

| Field | Required |
|-------|----------|
| `path` | yes | Short key (not full URL) |

**200** `redirect deleted successfully`

**404** `redirect not found`

#### `GET /{key}`

If `{key}` exists in KV, **200** HTML page with JS redirect to the stored URL.

**404** empty body if unknown key.

#### `GET /`

**200** empty plain-text body (health/index stub).

#### `GET /bytefix`

**200** JSON array of all KV entries `{ name, metadata, value }` (operator/debug).

#### `GET /recent-shares`

**200** `{ "success": true, "shares": [{ "book", "bytes" }, ...] }` — up to 5 newest non-join shares.

#### `GET /robots.txt`

**200** `Disallow: /`

---

## Brick (`net-brick-worker.js`)

CORS proxy for browser fetches to third-party HTTPS APIs (Museum of ZZT search, screenshots, downloads). Clients never call upstream hosts directly; they use `brick.zed.cafe/?brick=<base64url>` where the param is a base64url-encoded absolute `http(s)` URL.

### Routes (`https://brick.zed.cafe`)

| Method | Query | Behavior |
|--------|-------|----------|
| `OPTIONS` | `brick=<base64url>` | CORS preflight |
| `GET`, `HEAD`, `POST`, … | `brick=<base64url>` | Decodes param (base64url first, legacy percent-encoded URL fallback), then proxies with same method, headers, and body |

Upstream response is streamed back with CORS headers added (`Access-Control-Allow-Origin: *`).

**400** `brick not found` if `brick` query param missing or does not decode to an `http(s)` URL.

**500** `brick is sad` if upstream fetch throws.

Example (from client):

```
https://brick.zed.cafe/?brick=aHR0cHM6Ly9tdXNldW1vZnp6dC5jb20vYXBpL3YxL3NlYXJjaC9maWxlcy8_b2Zmc2V0PTAmdGl0bGU9Zm9v
```

---

## Terminal (`net-terminal-worker.js`)

PeerJS signaling server for multiplayer net terminal. One Durable Object per peer ID relays WebSocket messages between browsers; media/data flows peer-to-peer after handshake.

Client config: [`zss/feature/netterminal.ts`](../zss/feature/netterminal.ts) (`host: terminal.zed.cafe`, default path `/`, key `peerjs`). No KV bindings.

**TURN follow-up:** signaling only. To help peers behind strict NATs, add `config.iceServers` in `peerserveroptions()` when you deploy a TURN server.

### Routes (`https://terminal.zed.cafe`)

| Method | Path | Behavior |
|--------|------|----------|
| `GET` | `/peerjs` | **200** PeerJS welcome JSON |
| `GET` | `/peerjs/id` | **200** plain-text UUID (server-assigned peer id) |
| `GET` | `/peerjs?key=peerjs&id={id}&token={token}&version={v}` | WebSocket upgrade → peer's Durable Object; **101** with `OPEN` frame |

Cross-peer messages (OFFER, ANSWER, CANDIDATE, etc.) relay DO-to-DO. Same peer id with a different token gets `ID-TAKEN`.

---

## Local tooling

- Seed ZNS docs namespace: `ZNS_EMAIL=... ZNS_TOKEN=... node infra/seed-zns-docs.mjs` (writes `zss/rom/refscroll/*.md` to `docs.at.zed.cafe` via `POST /api/set`).

---

## Cloudflare deploy (Wrangler)

Wrangler is a dev dependency (`yarn wrangler`). Configs live in this folder but **all `yarn wrangler` commands must be run from the repo root** with `-c infra/wrangler-*.toml` (running from `infra/` does not work).

| Worker | Config |
|--------|--------|
| ZNS | `infra/wrangler-zns.toml` |
| Bytes | `infra/wrangler-bytes.toml` |
| Brick | `infra/wrangler-brick.toml` |
| Terminal | `infra/wrangler-terminal.toml` |

### One-time setup

Run from repo root.

1. Log in (opens browser):

   ```bash
   yarn wrangler login
   ```

2. List KV namespaces and copy the `id` for each worker binding (`zns`, `kv`):

   ```bash
   yarn wrangler kv namespace list
   ```

   If a namespace does not exist yet:

   ```bash
   yarn wrangler kv namespace create zns
   yarn wrangler kv namespace create kv
   ```

3. Paste each KV `id` into the matching `infra/wrangler-*.toml` (replace `PASTE_KV_NAMESPACE_ID`).

4. Set the ZNS email secret (Resend API key):

   ```bash
   yarn wrangler secret put RESEND_API_KEY -c infra/wrangler-zns.toml
   ```

### Deploy

From repo root:

```bash
yarn deploy:cloudflare:zns
yarn deploy:cloudflare:bytes
yarn deploy:cloudflare:brick
yarn deploy:cloudflare:terminal
```

Equivalent raw Wrangler commands (also from repo root):

```bash
yarn wrangler deploy -c infra/wrangler-zns.toml
yarn wrangler deploy -c infra/wrangler-bytes.toml
yarn wrangler deploy -c infra/wrangler-brick.toml
yarn wrangler deploy -c infra/wrangler-terminal.toml
```
