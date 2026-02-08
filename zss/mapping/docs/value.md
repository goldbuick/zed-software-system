# value.ts

**Purpose**: Coercion utilities — maptostring, maptonumber, maptovalue. Used when parsing or converting user input to typed values.

## Dependencies

None.

## Exports

| Export | Description |
|--------|-------------|
| `maptostring(value)` | `${value ?? ''}` |
| `maptonumber(arg, defaultvalue)` | parseFloat(maptostring); NaN → default |
| `maptovalue(arg, defaultvalue)` | Return arg if same type as default; else default |
