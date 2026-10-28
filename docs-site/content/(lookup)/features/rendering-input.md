---
title: Rendering & input
description: Rendering & input features in Zed Cafe / ZSS.
---

| Feature | Audience | Description | Pointer |
|---------|----------|-------------|---------|
| Layer compositing | Both | BLANK, TILES, SPRITES, DITHER, MEDIA, CONTROL layers. | `LAYER_TYPE enum` |
| Sprite rendering | Both | Shader-based per-player sprite overlays in R3F. | `zss/gadget/display/sprites.ts` |
| Board lighting | Creator | Dark boards with element light radius/dir. | `zss/memory/docs/board-lighting.md` |
| Keyboard + gamepad | Creator | Move, shoot, ok, cancel, menu, modifier keys. | `zss/gadget/userinput.tsx` |
| View scale | Creator | Adjust display zoom level for boards. | `VIEWSCALE` |
| Capture / screenshot | Both | Frame capture for export and #screenshot. | `zss/gadget/capture/` |
