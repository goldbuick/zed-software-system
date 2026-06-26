/*
 * WASI task: read ./zed-cafe/manifest.json and print the first chunk to stdout.
 * Drag-drop fixture for verifying zed-cafe FS visibility from a Wanix task.
 *
 * Success: "zed-cafe ok: " + bytes from manifest.json
 * Failure: "zed-cafe missing\n" (path_open) or "zed-cafe empty\n" (read)
 */
typedef unsigned int size_t;
typedef int __wasi_errno_t;
typedef unsigned int __wasi_fd_t;

typedef struct {
  const char *buf;
  size_t buf_len;
} __wasi_ciovec_t;

typedef struct {
  char *buf;
  size_t buf_len;
} __wasi_iovec_t;

__attribute__((import_module("wasi_snapshot_preview1"), import_name("fd_write")))
__wasi_errno_t __wasi_fd_write(
  __wasi_fd_t fd,
  const __wasi_ciovec_t *iovs,
  size_t iovs_len,
  size_t *nwritten);

__attribute__((import_module("wasi_snapshot_preview1"), import_name("fd_read")))
__wasi_errno_t __wasi_fd_read(
  __wasi_fd_t fd,
  __wasi_iovec_t *iovs,
  size_t iovs_len,
  size_t *nread);

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

static void write_bytes(const char *buf, size_t len) {
  __wasi_ciovec_t iov = { buf, len };
  size_t nwritten = 0;
  __wasi_fd_write(1, &iov, 1, &nwritten);
}

static void write_str(const char *msg) {
  write_bytes(msg, slen(msg));
}

#define PREOPEN_CWD 3
#define FD_READ_RIGHT 2ULL
#define FD_WRITE_RIGHT 64ULL
#define OFLAGS_CREAT_TRUNC 65

static void write_fd(__wasi_fd_t fd, const char *buf, size_t len) {
  __wasi_ciovec_t iov = { buf, len };
  size_t nwritten = 0;
  __wasi_fd_write(fd, &iov, 1, &nwritten);
}

static void write_marker(void) {
  const char *path = "zed-cafe-read.ok";
  __wasi_fd_t fd = 0;
  if (
    __wasi_path_open(
      PREOPEN_CWD,
      0,
      path,
      slen(path),
      OFLAGS_CREAT_TRUNC,
      FD_WRITE_RIGHT,
      0,
      0,
      &fd) != 0
  ) {
    return;
  }
  write_fd(fd, "ok\n", 3);
  __wasi_fd_close(fd);
}

__attribute__((export_name("_start")))
void _start(void) {
  const char *path = "zed-cafe/manifest.json";
  __wasi_fd_t opened = 0;
  __wasi_errno_t err = __wasi_path_open(
    PREOPEN_CWD,
    0,
    path,
    slen(path),
    0,
    FD_READ_RIGHT,
    0,
    0,
    &opened);
  if (err != 0) {
    write_str("zed-cafe missing\n");
    __wasi_proc_exit(1);
  }

  char buf[384];
  __wasi_iovec_t iov = { buf, sizeof(buf) };
  size_t nread = 0;
  err = __wasi_fd_read(opened, &iov, 1, &nread);
  __wasi_fd_close(opened);
  if (err != 0 || nread == 0) {
    write_str("zed-cafe empty\n");
    __wasi_proc_exit(1);
  }

  write_str("zed-cafe ok: ");
  write_bytes(buf, nread);
  write_str("\n");
  write_marker();
}
