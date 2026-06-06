#ifndef ZSS_LANG_API_H
#define ZSS_LANG_API_H

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
  const char* source;
  const char* source_map;
  const char* labels_json;
  ZssLangError* errors;
  int error_count;
} ZssCompileResult;

/** Compile ZSS source to JS + source map + labels JSON. Caller frees with zss_compile_result_free. */
ZssCompileResult* zss_compile(const char* name, const char* source);

void zss_compile_result_free(ZssCompileResult* result);

#ifdef __cplusplus
}
#endif

#endif
