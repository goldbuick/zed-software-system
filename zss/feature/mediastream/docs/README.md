---
title: Media Stream companion
description: Multi-destination Electron streaming companion (Twitch eRTMP, YouTube, TikTok)
---

# Media Stream

Cafe binds the companion with `#broadcast stream <peerid>` (or `#broadcast ms_…`). Destinations, Dual Format crop drag, and Start live in the Electron app under [`ops/media-stream/`](../../../ops/media-stream/README.md).

| Concern | Owner |
|---------|--------|
| Bind / stop | cafe `#broadcast stream` / `#broadcast stop` |
| Keys, Enhanced, Dual Format, crop | media-stream UI |
| Capture push | cafe on companion `golive` |

WHIP in-tab broadcast and media-stream are mutually exclusive.
