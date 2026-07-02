# Mapping Documentation

The mapping system provides utilities for types, arrays, numbers, strings, encoding, grapheme clusters, validation, 2D geometry, GUIDs, and timing.

## Module Index

| File | Purpose |
|------|---------|
| [types.md](types.md) | Type guards, MAYBE, deepcopy, isbook |
| [array.md](array.md) | range, pick, pickwith, array helpers |
| [number.md](number.md) | clamp, snap, randominteger, randomintegerwith |
| [string.md](string.md) | stringsplice, totarget, escape helpers |
| [encode.md](encode.md) | base64 / base64url encoding |
| [grapheme.md](grapheme.md) | graphemelength, graphemes, codeunitoffsettocellindex |
| [validate.md](validate.md) | isemail |
| [value.md](value.md) | maptostring, maptonumber, maptovalue |
| [2d.md](2d.md) | Index/PT conversion, distance, rect/line points |
| [guid.md](guid.md) | createsid, createpid, createnameid, etc. |
| [tick.md](tick.md) | TICK_RATE, TICK_FPS, DEFAULT_BPM, waitfor |
| [qr.md](qr.md) | QR code to $char lines |

Moved out of mapping (device/UI-specific): `doasync` → [`zss/device/doasync.ts`](../../device/doasync.ts); scroll animation → [`zss/screens/scroll/anim.ts`](../../screens/scroll/anim.ts).
