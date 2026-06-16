# url.ts

**Purpose**: URL shortening, join-mode detection, Museum of ZZT integration, ZNS login/publish.

Worker HTTP APIs: [`ops/infra/README.md`](../../../ops/infra/README.md).

## Exports

| Function | Args | Description |
|----------|------|-------------|
| `shorturl` | `url` | Create short URL via bytes.zed.cafe |
| `isjoin` | — | Check if running in join mode (URL param) |
| `museumofzztsearch` | `field`, `text`, `offset` | Search Museum of ZZT files |
| `museumofzztrandom` | — | Get random file from Museum of ZZT |
| `museumofzztscreenshoturl` | `content` | Screenshot URL for content |
| `museumofzztdownload` | `player`, `content` | Download ZZT file |
| `znslogin` | `email`, `namespace` | Start ZNS OTP login (namespace normalized to lowercase) |
| `znslogincode` | `email`, `code` | Confirm OTP (returns `token`) |
| `znslist` | `email`, `token` | List keys/values |
| `znsset` | `email`, `token`, `key`, `value` | Set pair: `peer` key, bytes hash, or text (auto-detect) |
| `znsread` | `namespace`, `key` | POST `/api/read` — public JSON `{ key, value, metadata }` |
| `znstenanturl` | `namespace`, `key` | Build canonical tenant URL (lowercase host) |
| `znsnormalizenamespace` | `namespace` | Trim + lowercase namespace label |
| `znsnormalizepathkey` | `name` | Slug for ZNS path keys |
| `znskeyispeer` | `key`, `kind?` | True for reserved `peer` key or `kind === 'peer'` |
| `znskinddisplay` | `kind?`, `key?` | Worker kind → menu label (`text` → `code`) |
| `znskeyopenlabel` | `key`, `value`, `kind?` | `#zns` menu key row label |
| `znskeylinkcommand` | `namespace`, `key`, `value`, `kind?` | `#zns` menu hyperlink payload (`openit` or `import code`) |
| `znsautopublishpeer` | `peerid`, `player` | Publish peer id to ZNS `peer` key when logged in |
| `znspersistlogin` / `znspersistlogout` | — | IDB session for ZNS |
| `znsdelete` | `email`, `token`, `key` | Delete pair |

| `readznsloginparamsfromurl` | — | Read `?zns-code=`, optional `?zns-email=`, `?zns-namespace=` for cross-device OTP |
| `readznslogincodefromurl` | — | Code only (legacy deep links) |
| `clearznsloginparamsfromurl` | — | Strip all zns login query params after deep link |

Apex API: `https://zns.zed.cafe` (`ZNS_APEX`). Tenant reads: `https://{namespace}.at.zed.cafe/{key}` (`ZNS_TENANT_SUFFIX`). Constants: `ZNS_DOCS_NAMESPACE`, `ZNS_PEER_KEY`, `ZNS_BYTES_KEY_TARGET`, `ZNS_LOGIN_CODE_PARAM`.

## Consumed By

- `zss/device/register.ts` — shorturl, isjoin, znsset
- `zss/device/vm.ts` — isjoin, museum
- `zss/gadget/engine.tsx` — isjoin
