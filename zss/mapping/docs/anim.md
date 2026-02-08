# anim.ts

**Purpose**: Animation utilities — snapping to char grid and damped position movement. Uses Three.js Object3D and maath easing.

## Dependencies

- `maath/easing` — damp, rsqw
- `three` — Object3D
- `./number` — snap

## Exports

| Export | Description |
|--------|-------------|
| `animsnapy(value)` | Snap to half char height (14*2*0.5) |
| `animsnapx(value)` | Snap to half char width (8*2*0.5) |
| `animpositiontotarget(object, axis, target, delta, velocity?)` | Damped move; returns true when |step| < 0.1 |

## Constants

- CHAR_SCALE=2, CHAR_WIDTH=8, CHAR_HEIGHT=14
- Uses object.userData for damp state; snaps output to grid
