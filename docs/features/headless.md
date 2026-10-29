---
title: Headless
description: Run Zed Cafe in a terminal, without the board canvas.
---

Headless is Zed Cafe in a terminal. Playwright opens the cafe app in Chromium with no window. The sim, `#` commands, and books are the same ones the browser runs. What you see is an Ink prompt. Each line you type is sent in as a command.

There is no board canvas and no WebGL. `bootheadless()` skips the canvas and starts the same message stack.

Player content, config, and command history are files in a data directory, not the browser's IndexedDB. The default directory is `.zss-data` in the current working directory. When a session creates a join URL, it is written to `join-url.txt` in that directory.

## Run it

Use a real terminal. The prompt needs a TTY. If stdin is not a terminal, the CLI prints that input is unavailable.

Dev, attached to the Vite server:

```bash
yarn task run headless:server:dev
```

That compiles the CLI, starts Vite on port 7777, then opens the prompt against that server. Ctrl+C stops both.

Built app, served from `cafe/dist`:

```bash
yarn task run headless:server:run
```

That builds the cafe app and the CLI, then serves `cafe/dist` on port 4175.

When the prompt reads `zed.cafe>`, type a command and press Enter. `#help` opens the reference. The up and down arrows walk command history.

The first launch needs Chromium for Playwright:

```bash
npx playwright install chromium
```

If you serve `cafe/dist` and that folder is missing, the CLI stops and tells you to run `yarn task run cafe:build`.

## Flags

After `yarn task run headless:build`, the CLI is `./bin/dev.js` in this repo (the published bin name is `zss`).

| Flag | Default | Effect |
|------|---------|--------|
| `--dev` | off | Attach to an already running Vite server instead of serving `cafe/dist`. |
| `--port` | 4175 | Port for that static server. Ignored with `--dev`. |
| `--data-dir` | `.zss-data` | Where player content, config, and history are stored. |

The Vite port is 7777. The same settings are the env vars `ZSS_DEV`, `ZSS_SERVER_PORT`, `ZSS_DEV_SERVER_PORT`, and `ZSS_DATA_DIR`.

```bash
./bin/dev.js --dev --data-dir .zss-data
```

## Where it lives

| Piece | Role |
|-------|------|
| `ops/headless/src/commands/run.ts` | CLI flags and the `zss` command. |
| `ops/headless/src/lib/app.tsx` | Playwright, the Ink prompt, and disk storage. |
| `cafe/index.tsx` | Headless boot. Skips the canvas. |
