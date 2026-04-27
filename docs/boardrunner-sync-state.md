# Board Runner Sync State

1. Memory - top level container
2. Flags - id -> map buckets
3. Gadget — one `flags` row per player: `flags[${playerId}_gadget]` holds full `GADGET_STATE`
4. Synth — one `flags` row per board: `flags[${boardId}_synth]` holds voices, voicefx, and play queue
4. Chip / Board flags
5. Board state
