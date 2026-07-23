---
title: CLI / headless
description: CLI / headless features in Zed Cafe / ZSS.
---

| Feature | Audience | Description | Pointer |
|---------|----------|-------------|---------|
| zss oclif binary | Dev | Run cafe SPA in Playwright with Ink terminal overlay. | `headless/src/commands/run.ts` |
| Headless boot | Dev | bootheadless() skips Canvas; same message stack. | `cafe/index.tsx` |
| Node storage hooks | Dev | CLI injects __nodeStorageReadPlayer for persistence. | `headless/src/lib/app.tsx` |
| Dev server mode | Dev | Attach to existing Vite dev server instead of cafe/dist. | `zss run --dev` |
