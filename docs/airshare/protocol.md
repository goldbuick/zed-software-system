---
title: Airshare wire protocol
description: Zed-owned fountain QR format for optical MEMORY transfer
---

# Airshare wire protocol

Clean-room optical transfer for a single `Uint8Array` (compressed MEMORY). Not compatible with Decimen / decimen.app.

## Frame layout

| Offset | Size | Field |
|--------|------|-------|
| 0 | 1 | magic `0xA2` |
| 1 | 1 | version `1` |
| 2 | 4 | session id (BE) |
| 6 | 4 | sequence (BE) |
| 10 | 2 | block count K (BE) |
| 12 | 2 | block size (BE) |
| 14 | 4 | total payload length (BE) |
| 18 | 32 | SHA-256 of full payload |
| 50 | block size | coded block |

Header size is 50 bytes. QR ECC L; payload bytes are raw binary (not base64).

## Systematic carousel

- For `seq < K`: frame payload is source block `seq` (zero-padded to block size).
- For `seq >= K`: payload is XOR of a mid-degree subset of blocks. Degree and indices come from mulberry32 seeded by `(session, seq)` (integer-only; no `Math.log`).

Receiver locks on stream identity (magic, version, session, K, block size, total length, hash). Any change resets the decoder. Peeling recovers all K blocks; trailing padding is trimmed via `totallen`. SHA-256 must match before `vm:books` apply.

## Capacity

Default target QR version 27 ECC L (~1465 byte capacity) so block size ≈ 1415. Sender loops forever; receiver needs any covering set of frames (full systematic sweep at zero loss).
