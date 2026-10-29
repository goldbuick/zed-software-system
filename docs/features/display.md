---
title: Display
description: Rendering, input, and end of game in Zed Cafe.
---

| Feature | Audience | Description | Pointer |
|---------|----------|-------------|---------|
| Layer compositing | Both | BLANK, TILES, SPRITES, DITHER, MEDIA, CONTROL layers. | `LAYER_TYPE enum` |
| Sprite rendering | Both | Shader-based per-player sprite overlays in R3F. | `zss/gadget/display/sprites.ts` |
| Keyboard + gamepad | Creator | Move, shoot, ok, cancel, menu, modifier keys. | `zss/gadget/userinput.tsx` |
| View scale | Creator | Adjust display zoom level for boards. | `VIEWSCALE` |
| Capture / #screenshot | Both | Frame capture for export. `#screenshot` captures the display (operator). | `zss/gadget/capture/` |
| #endgame | Both | End current game session and return to title flow. | `#endgame` |
