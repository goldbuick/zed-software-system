# Native C++ lang compiler modules

C++ reimplementation of the ZSS script compiler under `backend/native/zss/`.

## Module map

| File | TS source | Responsibility |
|------|-----------|----------------|
| `zss_lang_lexer.hpp` | `backend/typescript/lexer.ts` | Tokenizer + context-sensitive `text` |
| `zss_lang_parser.hpp` | `backend/typescript/parser.ts` + `visitor.ts` | Recursive descent parser → AST |
| `zss_lang_ast.hpp` | `visitor.ts` | `CodeNode` tree |
| `zss_lang_transformer.hpp` | `backend/typescript/transformer.ts` | JS + label emission |
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

Native parity harness (no Emscripten):

```bash
cd zss/feature/lang/backend/native
g++ -std=c++14 -O2 -I. -DZSS_LANG_PARITY_MAIN -o zss_lang_parity zss_lang_compile.cpp
./zss_lang_parity ../wasm/__fixtures__/parity
```

## API

```c
ZssCompileResult* zss_compile(const char* name, const char* source);
void zss_compile_result_free(ZssCompileResult* result);
```

Returns heap-allocated JS source, source map JSON, labels JSON. Production TS backend remains default until v1.5 rollout.
