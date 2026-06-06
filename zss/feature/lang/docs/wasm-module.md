# Per-script WASM module format

ZSS scripts compile to **standalone `.wasm` modules** executed via `WebAssembly.instantiate` with a fixed host import ABI. Each module exports `run() -> i32`.

## Module exports

| Export | Signature | Semantics |
|--------|-----------|-----------|
| `run` | `() -> i32` | Execute one generator step. Returns **1** to keep running, **0** when the program ends (matches `GeneratorFunc`). |

## Host imports (`"host"` module)

| Import | Signature | Role |
|--------|-----------|------|
| `call` | `(i32) -> i32` | Dispatch by `HOST_*` index; reads args from host arg stack |
| `push_i32` | `(i32) -> void` | Push integer arg (also used for boolean 0/1) |
| `push_f64` | `(f64) -> void` | Push float arg |
| `push_str` | `(i32, i32) -> void` | Push string from script linear memory `(ptr, len)` |

The script module owns a **read-only data segment** for string literals. Dynamic template strings call `push_str` with offsets into that segment.

## `HOST_*` dispatch indices

Stable across all scripts. Defined in [`hostcall.ts`](../hostcall.ts) and [`zss_lang_hostcall.hpp`](../backend/native/zss_lang_hostcall.hpp).

| Index | Name | CHIP method | Args (push order) |
|-------|------|-------------|-------------------|
| 0 | SY | `sy` | — |
| 1 | GETCASE | `getcase` | — |
| 2 | NEXTCASE | `nextcase` | — |
| 3 | JUMP | `jump` | i32 line |
| 4 | IF | `if` | i32+ words via stack |
| 5 | COMMAND | `command` | words |
| 6 | TEXT | `text` | str |
| 7 | STAT | `stat` | words |
| 8 | HYPERLINK | `hyperlink` | str + words |
| 9 | OR | `or` | words |
| 10 | AND | `and` | words |
| 11 | NOT | `not` | words |
| 12 | EXPR | `expr` | words |
| 13 | IS_EQ | `isEq` | lhs, rhs |
| 14 | IS_NOT_EQ | `isNotEq` | lhs, rhs |
| 15 | IS_LESS_THAN | `isLessThan` | lhs, rhs |
| 16 | IS_GREATER_THAN | `isGreaterThan` | lhs, rhs |
| 17 | IS_LESS_THAN_OR_EQ | `isLessThanOrEq` | lhs, rhs |
| 18 | IS_GREATER_THAN_OR_EQ | `isGreaterThanOrEq` | lhs, rhs |
| 19 | OP_PLUS | `opPlus` | lhs, rhs |
| 20 | OP_MINUS | `opMinus` | lhs, rhs |
| 21 | OP_POWER | `opPower` | lhs, rhs |
| 22 | OP_MULTIPLY | `opMultiply` | lhs, rhs |
| 23 | OP_DIVIDE | `opDivide` | lhs, rhs |
| 24 | OP_MOD_DIVIDE | `opModDivide` | lhs, rhs |
| 25 | OP_FLOOR_DIVIDE | `opFloorDivide` | lhs, rhs |
| 26 | OP_UNI_PLUS | `opUniPlus` | rhs |
| 27 | OP_UNI_MINUS | `opUniMinus` | rhs |
| 28 | PRINT | `print` | str |
| 29 | TRY | `try` | words |
| 30 | TAKE | `take` | words |
| 31 | GIVE | `give` | words |
| 32 | DUPLICATE | `duplicate` | words |
| 33 | REPEATSTART | `repeatstart` | index, words |
| 34 | REPEAT | `repeat` | index |
| 35 | FOREACHSTART | `foreachstart` | index, words |
| 36 | FOREACH | `foreach` | index, words |
| 37 | WAITFOR | `waitfor` | words |
| 38 | API | dynamic | method name str + words (fallback for `#` API nodes) |

Return values from `call` use CHIP semantics: **1** truthy / success, **0** falsy / failure unless the method returns a WORD.

## Control-flow lowering

The emitter mirrors the JS coroutine in [`transformer.ts`](../backend/typescript/transformer.ts):

```text
loop main:
  if sy(): return 1
  switch getcase():
    case N: ...; break
    default: return 0
  nextcase()
  br main
```

WASM uses `loop` + nested `block`s + `br_table` on `getcase - 1` (cases are 1-based in ZSS).

`jump(L); continue` → `call JUMP(L); br main`.

## `debug_map` JSON

Emitted alongside `wasm_bytes`:

```json
{
  "cases": { "1": { "line": 2, "column": 1 }, "2": { "line": 3, "column": 1 } }
}
```

Maps execution case index to ZSS source location for stack traces.

## `import_manifest` JSON

List of `HOST_*` indices referenced by the module (for loader validation):

```json
{ "hosts": [0, 1, 2, 3, 4] }
```

## Compile result (`zss_compile`)

See [`zss_lang_api.h`](../backend/native/zss_lang_api.h). Primary output is `wasm_bytes` / `wasm_bytes_len`. JS `source` is omitted in production builds.
