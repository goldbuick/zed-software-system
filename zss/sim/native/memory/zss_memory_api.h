#ifndef ZSS_MEMORY_API_H
#define ZSS_MEMORY_API_H

#ifdef __cplusplus
extern "C" {
#endif

/** Reset session state for a new fixture. */
void zss_memory_init(void);

/** Release heap owned by the session. */
void zss_memory_free(void);

/** Load MEMORY_ROOT JSON from `initial.root` fixture shape. Returns 0 on success. */
int zss_memory_import_json(const char* json);

/** Full MEMORY_ROOT JSON export; caller must free with zss_memory_free_string. */
char* zss_memory_export_json(void);

/** Wire-filtered MEMORY_ROOT JSON export. */
char* zss_memory_export_wire_json(void);

/**
 * Run a parity fixture operation. `args_json` is JSON object or null.
 * Returns JSON result string; caller frees with zss_memory_free_string.
 * Returns null on hard failure.
 */
char* zss_memory_run_op(const char* op, const char* args_json);

void zss_memory_free_string(char* s);

#ifdef __cplusplus
}
#endif

#endif
