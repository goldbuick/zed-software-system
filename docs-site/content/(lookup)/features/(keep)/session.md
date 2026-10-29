---
title: Session
description: Save, login, and reset a Zed Cafe session.
---

| Feature | Audience | Description | Pointer |
|---------|----------|-------------|---------|
| IndexedDB persistence | Both | Config, CLI history, bookmarks, permissions stored locally. | `zss/feature/docs/storage.md` |
| Player token / login | Both | Session auth via vm:login/logout handlers. | `zss/device/vm/handlers/auth.ts` |
| #dev / #save | Both | Dev halt (operator); save and persist current state. | `#save` |
| #nuke / #restart | Both | Operator reset: countdown wipe or restart chip/player state. | `#nuke` |
