---
title: memoryfs
description: Projected MEMORY filesystem via Chromium File System Access
---

# memoryfs

Drop a folder onto cafe to project durable MEMORY into `<folder>/memoryfs/` as a JSON tree. Chromium only (File System Access API).

## Behavior

- **Attach:** create `memoryfs/`, nuclear-clear it, export current MEMORY, then live sync.
- **Write-through:** MEMORY edits debounce (~2s) to disk.
- **Inbound:** external edits/deletes under `memoryfs/` reload into MEMORY (except read-only player object JSON).
- **Detach:** `#memoryfs detach` stops immediately with no final flush.

## Tree

See module README for path layout, flag owner filters (`*_chip`, `*_tracking`, …), and read-only `board/objects/{pid_*}.json`.

## Commands

- `#memoryfs status`
- `#memoryfs detach`

Related: jsonpipe syncs MEMORY to boardrunner workers — not this disk projection.
