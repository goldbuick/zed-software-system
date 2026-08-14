---
title: Terminal & CLI
description: Terminal & CLI features in Zed Cafe / ZSS.
---

| Feature | Audience | Description | Pointer |
|---------|----------|-------------|---------|
| #help — reference scroll | Creator | Open in-world help and command documentation. | `#help` |
| #books / #pages / #boards | Creator | List books, pages, and board goto hyperlinks. | `#books` |
| #pageopen / #boardopen | Creator | Open codepage editor or teleport player to board. | `#pageopen` |
| #gadget | Creator | Toggle built-in inspector for element editing. | `#gadget` |
| #findany | Creator | Highlight elements matching a search pattern. | `#findany` |
| #dev / #save / #fork | Both | Dev halt (operator); save and fork (persist) -- join players get a personal copy. | `#dev` |
| #nuke / #restart | Both | Operator reset: countdown wipe or restart chip/player state. | `#nuke` |
| #export / #bookallexport | Both | Export menus and JSON book/page export (operator). | `#export` |
| #zztsearch / #zztrandom | Creator | Search or random ZZT Museum content. | `#zztsearch` |
| #admin | Both | Show admin interface for session moderation. | `#admin` |
| #joincode / #jointab | Both | Start or join multiplayer via code or tab (operator for host). | `#joincode` |
| #chat / #broadcast | Both | Chat bridges and stream broadcast control. | `#chat` |
| #zns | Creator | ZNS login, list, publish, delete published content. | `#zns` |
| #screenshot | Both | Capture display screenshot (operator). | `#screenshot` |
| #endgame | Both | End current game session and return to title flow. | `#endgame` |
| #bookrename / #pagetrash / #trash | Creator | Rename books or trash pages and books. | `#bookrename` |
| #pageexport / #bookexport | Both | Export single page or full book JSON. | `#pageexport` |
| #ttsvol | Creator | Set TTS playback volume level. | `#ttsvol` |
| Speech-to-text (mic) | Creator | Pause-based mic input on tape; lazy sttspace worker transcribes. | `zss/screens/terminal/input.tsx` |
