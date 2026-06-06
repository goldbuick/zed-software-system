#ifndef ZSS_LANG_API_H
#define ZSS_LANG_API_H

#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef struct ZssLangError {
  int offset;
  int line;
  int column;
  int length;
  const char* message;
} ZssLangError;

typedef struct ZssCompileResult {
  /** Legacy — unused; TS transformer is the JS oracle for CI only. */
  const char* source;
  /** Legacy — unused. */
  const char* source_map;
  const char* labels_json;
  const uint8_t* wasm_bytes;
  size_t wasm_bytes_len;
  const char* debug_map;
  const char* import_manifest;
  ZssLangError* errors;
  int error_count;
} ZssCompileResult;

/** Compile ZSS source to WASM module bytes + labels + debug map. Caller frees with zss_compile_result_free. */
ZssCompileResult* zss_compile(const char* name, const char* source);

void zss_compile_result_free(ZssCompileResult* result);

#ifdef __cplusplus
}
#endif

#endif
