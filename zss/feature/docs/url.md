# url.ts

**Purpose**: URL shortening, join-mode detection, Museum of ZZT integration, ZNS login/publish.

## Exports

| Function | Args | Description |
|----------|------|-------------|
| `shorturl` | `url` | Create short URL via bytes.zed.cafe |
| `isjoin` | — | Check if running in join mode (URL param) |
| `museumofzztsearch` | `field`, `text`, `offset` | Search Museum of ZZT files |
| `museumofzztrandom` | — | Get random file from Museum of ZZT |
| `museumofzztscreenshoturl` | `content` | Screenshot URL for content |
| `museumofzztdownload` | `player`, `content` | Download ZZT file |
| `znslogin` | `email`, `namespace` | Start ZNS OTP login |
| `znslogincode` | `email`, `code` | Confirm OTP (returns `token`) |
| `znslist` | `email`, `token` | List keys/values |
| `znsset` | `email`, `token`, `key`, `value` | Set pair: `peer` key, bytes hash, or text (auto-detect) |
| `fetchznstext` | `namespace`, `key` | GET `https://{namespace}.zns.zed.cafe/{key}` markdown body |
| `znsautopublishpeer` | `peerid`, `player` | Publish peer id to ZNS `peer` key when logged in |
| `znspersistlogin` / `znspersistlogout` | — | IDB session for ZNS |
| `znsdelete` | `email`, `token`, `key` | Delete pair |

## Consumed By

- `zss/device/register.ts` — shorturl, isjoin, znsset
- `zss/device/vm.ts` — isjoin, museum
- `zss/gadget/engine.tsx` — isjoin
