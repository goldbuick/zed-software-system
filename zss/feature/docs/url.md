# url.ts

**Purpose**: URL shortening, join-mode detection, Museum of ZZT integration, BBS login/publish.

## Exports

| Function | Args | Description |
|----------|------|-------------|
| `shorturl` | `url` | Create short URL via bytes.zed.cafe |
| `isjoin` | — | Check if running in join mode (URL param) |
| `museumofzztsearch` | `field`, `text`, `offset` | Search Museum of ZZT files |
| `museumofzztrandom` | — | Get random file from Museum of ZZT |
| `museumofzztscreenshoturl` | `content` | Screenshot URL for content |
| `museumofzztdownload` | `player`, `content` | Download ZZT file |
| `bbslogin` | `email`, `tag` | Login to BBS |
| `bbslogincode` | `email`, `code` | Login with code |
| `bbslist` | `email`, `code` | List BBS posts |
| `bbspublish` | `email`, `code`, `filename`, `url`, `tags` | Publish to BBS |
| `bbsdelete` | `email`, `code`, `filename` | Delete from BBS |

## Consumed By

- `zss/device/register.ts` — shorturl, isjoin
- `zss/device/vm.ts` — isjoin, museum/bbs
- `zss/gadget/engine.tsx` — isjoin
