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

static size_t slen(const char *str) {
  size_t n = 0;
  while (str[n] != '\0') {
    ++n;
  }
  return n;
}

__attribute__((export_name("_start")))
void _start(void) {
  const char *msg = "Hello from wanix!\n";
  __wasi_ciovec_t iov = { msg, slen(msg) };
  size_t nwritten = 0;
  __wasi_fd_write(1, &iov, 1, &nwritten);
}
