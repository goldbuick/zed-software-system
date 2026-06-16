# Infra workers

Cloudflare Workers in this folder back public `*.zed.cafe` services used by the client (`zss/feature/url.ts`, net terminal `#zns`, share links, Museum of ZZT proxy).

| Worker | Source | Production host |
|--------|--------|-----------------|
| ZNS | `net-zns-worker.js` | `at.zed.cafe`, `*.{namespace}.at.zed.cafe` |
| Bytes | `net-bytes-worker.js` | `bytes.zed.cafe` |
| Brick | `net-brick-worker.js` | `brick.zed.cafe` |
| Terminal | `net-terminal-worker.js` | `terminal.zed.cafe` |

Client-side wrappers and constants live in [`zss/feature/url.ts`](../../zss/feature/url.ts). See also [`zss/feature/docs/url.md`](../../zss/feature/docs/url.md).

---

## ZNS (`net-zns-worker.js`)

Email + OTP login, namespace claim, long-lived token, and per-namespace key/value pairs stored in KV.

### Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `ZNS_APEX` | `at.zed.cafe` | Apex hostname for API routes |
| `ZNS_TENANT_SUFFIX` | `at.zed.cafe` | Hostname suffix for tenant reads (`{namespace}.{suffix}`) |
| `BYTES_ORIGIN` | `https://bytes.zed.cafe` | Redirect target for bytes pairs |
| `JOIN_ORIGIN` | `https://zed.cafe` | Redirect target for `peer` pairs |
| `RESEND_API_KEY` | — | Sends OTP email (`#zns {code}` subject) |
| `zns` | — | KV namespace binding |

### Apex API (`https://at.zed.cafe`)

#### Apex landing (`GET /`)

Public `GET` / `HEAD` on `/` only. Returns a **VGA-styled HTML page** (EGA colors on `#0000AA` dkblue, top-left flow layout) with IBM EGA 8×14 font (`/fonts/IBMEGA8x14.woff`, 28px tight grid).

| Section | Content |
|---------|---------|
| What it is | Namespace publishing under `{namespace}.at.zed.cafe` |
| Login | Copy hint `#zns <email> <namespace>`; link to `{JOIN_ORIGIN}` |
| Example | `https://docs.at.zed.cafe/algoscroll` |

**200** `text/html; charset=utf-8`, `Cache-Control: public, max-age=3600`, `X-Robots-Tag: noindex`.

Static assets live in [`ops/infra/zns-public/`](zns-public/) (Wrangler `[assets]` binding).

**404** for any other apex path (including `GET /api/*`).

OTP login email stays 40-column with the existing ZZT-index email palette.

#### API routes

All API routes are `POST` with `multipart/form-data`. Responses are JSON unless noted. CORS allows `GET, POST` from any origin.

#### `POST /api/login`

Start OTP login and reserve a namespace for the email.

| Field | Required | Notes |
|-------|----------|-------|
| `email` | yes | Lowercased/trimmed |
| `namespace` | yes | `[a-z0-9-]`, 1–63 chars; reserved: `www`, `api`, `mail`, `ftp` |

**200** `{ "success": true }` — OTP emailed. Subject: `{code} — finish login to {namespace} on zed.cafe`. Body: 16-color ASCII terminal HTML (ZZT palette from `zss/feature/palette.ts`), plain-text `#zns {code}` + deep link `{JOIN_ORIGIN}/?zns-code={code}&zns-email={email}&zns-namespace={namespace}`. Sender display name: `zed.cafe`.

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

#### `POST /api/read`

Public read of one key in any namespace. No authentication.

| Field | Required |
|-------|----------|
| `namespace` | yes |
| `key` | yes |

**200** `{ "success": true, "key", "value", "metadata" }` — raw stored value for all kinds (`text`, `peer`, `bytes`).

**400** invalid namespace or key.

**404** key not found.

#### `POST /api/delete`

Delete one key.

| Field | Required |
|-------|----------|
| `email` | yes |
| `token` | yes |
| `key` | yes |

**200** `{ "success": true }`

### Tenant reads (`https://{namespace}.at.zed.cafe`)

Public `GET` / `HEAD` only. Mixed-case hosts (e.g. `WiL.at.zed.cafe`) redirect **301** to the lowercase canonical URL (`wil.at.zed.cafe`).

**Do not** configure `docs.zed.cafe` or `{namespace}.zed.cafe` — tenant URLs are only `{namespace}.at.zed.cafe` (see `ZNS_TENANT_SUFFIX` in [`zss/feature/url.ts`](../../zss/feature/url.ts)).

#### Tenant landing (`GET /`)

On every `{namespace}.at.zed.cafe`, `GET /` returns a **VGA HTML key index** (same styling as scroll pages).

1. Lists keys from KV (`pair:{namespace}:*`), grouped by kind: `bytes` → `peer` → `text`, alphabetical within each group.
2. Each key links to `/{key}` on the same host.
3. Empty namespace: **200** with “no keys published”.

Tenant content is **KV-published only** — the worker does not bundle refscroll or other built-in markdown.

#### Tenant key read (`GET /{key}`)

`{key}` is the first path segment (lowercased).

| Kind | Response |
|------|----------|
| `text` | **200** VGA HTML scroll (`text/html`); `Cache-Control: public, max-age=60` |
| `peer` | **302** to `{JOIN_ORIGIN}/join/#{peerId}` |
| `bytes` | **302** to `{BYTES_ORIGIN}/{hash}` |

**404** if key missing or invalid. The `docs` namespace returns an HTML scroll with `doc not found`; other namespaces return plain `not found`.

Raw stored markdown is available via `POST /api/read` only (unchanged).

Publish docs via `POST /api/set` after login (`#zns <email> <namespace>`). In-app help still loads from client ROM (`zss/rom/refscroll/`); ZNS serves only what is published to KV.

VGA font asset is generated via `yarn task run zns:vga:sync` (runs automatically before `deploy:cloudflare:zns`).

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

Client config: [`zss/feature/netterminal.ts`](../../zss/feature/netterminal.ts) (`host: terminal.zed.cafe`, default path `/`, key `peerjs`). No KV bindings.

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

- **ZNS worker preview:** `yarn task run zns:landing:dev` (syncs VGA font, then starts wrangler on port 8787).
  - Apex landing: [http://127.0.0.1:8787/](http://127.0.0.1:8787/) or [http://at.zed.cafe:8787/](http://at.zed.cafe:8787/) with hosts below.
  - Tenant index: [http://docs.at.zed.cafe:8787/](http://docs.at.zed.cafe:8787/) — KV-published keys only.
  - Tenant scrolls: add to `/etc/hosts`:
    ```
    127.0.0.1 at.zed.cafe docs.at.zed.cafe
    ```
    then open paths under `http://docs.at.zed.cafe:8787/{key}` after publishing via `POST /api/set`.
  - Edits to [`net-zns-worker.js`](net-zns-worker.js) hot-reload; refresh the browser.
- **VGA font sync only:** `yarn task run zns:vga:sync`

---

## Cloudflare DNS + TLS (tenant hosts — production)

Tenant hostnames use the `at.zed.cafe` suffix only (`https://{namespace}.at.zed.cafe/`). **Do not** add DNS or worker routes for `docs.zed.cafe`.

### One-time DNS (zone `zed.cafe`)

Add **proxied** records so tenant wildcards and the apex resolve through Cloudflare:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| `AAAA` | `at` | `100::` (dummy) | Proxied |
| `AAAA` | `*.at` | `100::` (dummy) | Proxied |

In the Cloudflare dashboard the in-zone names are `at` and `*.at` (not `*.at.zed.cafe`). The `at` record serves the ZNS apex (`https://at.zed.cafe/`); `*.at` covers `docs.at.zed.cafe`, `wil.at.zed.cafe`, and all other tenant namespaces.

### One-time TLS

Universal SSL for `*.zed.cafe` does **not** cover `foo.at.zed.cafe`. Provision a certificate for `*.at.zed.cafe` via **Total TLS** (SSL/TLS → Edge Certificates) or **Advanced Certificate Manager**.

### Production deploy + verify

Standard ZNS production deploy (worker + verification):

```bash
yarn task run deploy:cloudflare:zns:verify
```

This runs `deploy:cloudflare:zns` then `zns:tenant:verify` (DNS + HTTPS).

| Task | Purpose |
|------|---------|
| `zns:tenant:dns:check` | Fast DNS-only check (`dig` on `docs.at` and `wil.at`) |
| `zns:tenant:smoke` | HTTPS-only check on `/` and `/cliscroll` |
| `zns:tenant:verify` | Full production suite (DNS + apex + tenant index + scroll) |

Verifier script: [`tasks/implementations/deploy/zns-tenant-verify.mjs`](../../tasks/implementations/deploy/zns-tenant-verify.mjs).

Checks performed by `zns:tenant:verify`:

1. `docs.at.zed.cafe` and `wil.at.zed.cafe` resolve (proves `*.at` wildcard, not a one-off record)
2. `docs.zed.cafe` does **not** resolve (wrong hostname pattern)
3. `https://at.zed.cafe/` → HTTP 200
4. `https://docs.at.zed.cafe/` → HTTP 200 `text/html`
5. `https://docs.at.zed.cafe/cliscroll` → HTTP 200 `text/html`

If DNS check fails: add proxied `AAAA` `*.at` → `100::` in the `zed.cafe` zone.

If HTTPS fails but DNS passes: enable TLS for `*.at.zed.cafe`.

---

## Cloudflare deploy (Wrangler)

Wrangler is a dev dependency (`yarn wrangler`). Configs live in this folder but **all `yarn wrangler` commands must be run from the repo root** with `-c ops/infra/wrangler-*.toml` (running from `ops/infra/` does not work).

| Worker | Config |
|--------|--------|
| ZNS | `ops/infra/wrangler-zns.toml` |
| Bytes | `ops/infra/wrangler-bytes.toml` |
| Brick | `ops/infra/wrangler-brick.toml` |
| Terminal | `ops/infra/wrangler-terminal.toml` |

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

3. Paste each KV `id` into the matching `ops/infra/wrangler-*.toml` (replace `PASTE_KV_NAMESPACE_ID`).

4. Set the ZNS email secret (Resend API key):

   ```bash
   yarn wrangler secret put RESEND_API_KEY -c ops/infra/wrangler-zns.toml
   ```

### Deploy

From repo root:

```bash
yarn task run deploy:cloudflare:zns:verify
```

Deploy workers individually (without verify):

```bash
yarn task run deploy:cloudflare:zns
yarn task run deploy:cloudflare:bytes
yarn task run deploy:cloudflare:brick
yarn task run deploy:cloudflare:terminal
```

Post-deploy verification only:

```bash
yarn task run zns:tenant:verify
```

Equivalent raw Wrangler commands (also from repo root):

```bash
yarn wrangler deploy -c ops/infra/wrangler-zns.toml
yarn wrangler deploy -c ops/infra/wrangler-bytes.toml
yarn wrangler deploy -c ops/infra/wrangler-brick.toml
yarn wrangler deploy -c ops/infra/wrangler-terminal.toml
```
