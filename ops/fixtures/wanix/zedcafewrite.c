/*
 * WASI task: overwrite ./zed-cafe/stats.json with a guestTouch marker.
 * Verifies guest write path on the live zed-cafe ns bind.
 *
 * Success: "zed-cafe write ok\n"
 * Failure: "zed-cafe write fail\n"
 */
typedef unsigned int size_t;
typedef int __wasi_errno_t;
typedef unsigned int __wasi_fd_t;

typedef struct {
  const char *buf;
  size_t buf_len;
} __wasi_ciovec_t;

__attribute__((import_module("wasi_snapshot_preview1"), import_name("fd_write")))
__wasi_errno_t __wasi_fd_write(
  __wasi_fd_t fd,
  const __wasi_ciovec_t *iovs,
  size_t iovs_len,
  size_t *nwritten);

__attribute__((import_module("wasi_snapshot_preview1"), import_name("path_open")))
__wasi_errno_t __wasi_path_open(
  __wasi_fd_t fd,
  unsigned int dirflags,
  const char *path,
  size_t path_len,
  unsigned int oflags,
  unsigned long long fs_rights_base,
  unsigned long long fs_rights_inheriting,
  unsigned int fdflags,
  __wasi_fd_t *opened_fd);

__attribute__((import_module("wasi_snapshot_preview1"), import_name("fd_close")))
__wasi_errno_t __wasi_fd_close(__wasi_fd_t fd);

__attribute__((import_module("wasi_snapshot_preview1"), import_name("proc_exit")))
void __wasi_proc_exit(unsigned int exitcode) __attribute__((noreturn));

static size_t slen(const char *str) {
  size_t n = 0;
  while (str[n] != '\0') {
    ++n;
  }
  return n;
}

static void write_str(const char *msg) {
  __wasi_ciovec_t iov = { msg, slen(msg) };
  size_t nwritten = 0;
  __wasi_fd_write(1, &iov, 1, &nwritten);
}

#define PREOPEN_CWD 3
#define FD_WRITE_RIGHT 64ULL
#define OFLAGS_CREAT_TRUNC 65

__attribute__((export_name("_start")))
void _start(void) {
  const char *path = "zed-cafe/stats.json";
  const char *payload =
    "{\"exportedAt\":\"guest\",\"bookCount\":0,\"books\":[],\"guestTouch\":true}\n";
  __wasi_fd_t opened = 0;
  __wasi_errno_t err = __wasi_path_open(
    PREOPEN_CWD,
    0,
    path,
    slen(path),
    OFLAGS_CREAT_TRUNC,
    FD_WRITE_RIGHT,
    0,
    0,
    &opened);
  if (err != 0) {
    write_str("zed-cafe write fail\n");
    __wasi_proc_exit(1);
  }
  __wasi_ciovec_t iov = { payload, slen(payload) };
  size_t nwritten = 0;
  err = __wasi_fd_write(opened, &iov, 1, &nwritten);
  __wasi_fd_close(opened);
  if (err != 0 || nwritten == 0) {
    write_str("zed-cafe write fail\n");
    __wasi_proc_exit(1);
  }
  write_str("zed-cafe write ok\n");
  __wasi_proc_exit(0);
}
