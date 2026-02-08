# boardremix.ts

**Purpose**: Exports `boardremix` — procedural board generation using wavefunction collapse. Uses source board as pattern/tileset to generate target region. Used by firmware `remix` command.

## Dependencies

- `wavefunctioncollapse` — WFC algorithm
- `zss/mapping/array` — pick
- `zss/mapping/types` — isnumber, ispresent
- `zss/memory/*` — board init, read, write, spatial queries
- `zss/words/reader` — READ_CONTEXT
- `zss/words/types` — NAME, PT
- `./boardcopy` — mapelementcopy

## Exports

| Function | Args | Description |
|----------|------|-------------|
| `boardremix` | `target`, `source`, `patternsize`, `mirror`, `p1`, `p2`, `targetset` | Generate target region from source using WFC; patternsize and mirror control pattern; returns boolean success |

## Algorithm

- Scans source board into image (element kinds mapped to alpha indices)
- Builds WFC model from source patterns
- Generates target region; clears existing elements first
- Maps alpha indices back to element kinds and writes terrain/objects
