---
title: Gadget documentation
---

Gadget owns render projection, display (R3F), scrolls/panels, and user input for the fantasy terminal.

## Module index

| Doc | Purpose |
|-----|---------|
| [gadget-scrolls.mdx](gadget-scrolls.mdx) | In-world scroll/panel UI driven by gadget layers |
| [scroll-vs-terminal-hyperlinks.md](scroll-vs-terminal-hyperlinks.md) | Hyperlink behavior differences between scrolls and tape |
| [Render/gadget perf optimizations (Aug 2026)](../../perf/docs/render-gadget-optimizations.md) | Control cache (`readgadgetcontrol`), patch commit path, debugging stale camera |

## Related

- Engine entry: [`engine.tsx`](../engine.tsx)
- Memory inspection (creator tools): [inspection.md](../../memory/docs/inspection.md)
- Spine features: [Inspector & gadget tools](https://zed.cafe/docs/features/inspector-gadget-tools/)
