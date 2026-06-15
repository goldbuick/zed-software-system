# C++ lang compiler modules

C++ ZSS script compiler under `backend/wasm/`.

## Module map

| File | TS source | Responsibility |
|------|-----------|----------------|
| `zss_lang_lexer.hpp` | `backend/typescript/lexer.ts` | Tokenizer + context-sensitive `text` |
| `zss_lang_parser.hpp` | `backend/typescript/parser.ts` + `visitor.ts` | Recursive descent parser → AST |
| `zss_lang_ast.hpp` | `visitor.ts` | `CodeNode` tree |
| `zss_lang_transformer.hpp` | `backend/typescript/transformer.ts` | JS oracle emission (parity) |
| `zss_lang_wasm_emitter.hpp` | `backend/typescript/transformer.ts` | Per-script WASM module emission |
| `zss_lang_wasm_writer.hpp` | — | WASM binary writer |
| `zss_lang_hostcall.hpp` | `hostcall.ts` | Stable `HOST_*` dispatch indices |
| `zss_lang_sourcemap.hpp` | `source-map` `SourceNode` | VLQ v3 source maps |
| `zss_lang_textformat.hpp` | `zss/words/textformat.ts` | `$name` template strings |
| `zss_lang_compile.cpp` | `generator.ts` pipeline | `zss_compile` orchestration |
| `zss_lang_api.h` | — | Extern C API |

## Build

From repo root:

```bash
yarn lang:build
```

Output: `cafe/public/wasm/lang/zss_lang.{js,wasm}`

Parity harness (no Emscripten):

```bash
cd zss/feature/lang/backend/wasm
g++ -std=c++14 -O2 -I. -DZSS_LANG_PARITY_MAIN -o zss_lang_parity zss_lang_compile.cpp
./zss_lang_parity fixtures/lang/parity
```

## API

```c
ZssCompileResult* zss_compile(const char* name, const char* source);
void zss_compile_result_free(ZssCompileResult* result);
```

Returns heap-allocated WASM bytes, labels JSON, debug map, and import manifest.
