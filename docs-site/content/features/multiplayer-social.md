---
title: Multiplayer & social
description: Multiplayer & social features in Zed Cafe / ZSS.
---

| Feature | Audience | Description | Pointer |
|---------|----------|-------------|---------|
| PeerJS join codes | Both | Share zed.cafe/join/#code URLs for sessions. | `#joincode` |
| Tab join | Both | Join multiplayer session from another browser tab. | `#jointab` |
| Hidden sessions | Both | Join clients use joinvm (no sim tick); host runs authoritative sim. | `/join/ URL` |
| Stream broadcast | Both | Start/stop live stream broadcast. | `#broadcast` |
| Twitch chat bridge | Both | Connect Twitch chat to in-game terminal. | `bridge/twitchchatconnector.ts` |
| RSS / Mastodon / Bluesky | Both | Social feed chat connectors. | `bridge/chatconnector.ts` |
| Net terminal | Both | P2P terminal sharing via terminal.zed.cafe. | `zss/feature/docs/netterminal.md` |
