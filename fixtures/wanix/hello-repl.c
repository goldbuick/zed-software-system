/* Build: yarn task run wanix:wasm:build:c (needs wasi-sdk), or use hello-repl.wat + wanix:wasm:build. */
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

static size_t slen(const char *str) {
  size_t n = 0;
  while (str[n] != '\0') {
    ++n;
  }
  return n;
}

static void writestr(const char *msg) {
  __wasi_ciovec_t iov = { msg, slen(msg) };
  size_t nwritten = 0;
  __wasi_fd_write(1, &iov, 1, &nwritten);
}

static size_t trimnewline(char *buf, size_t len) {
  while (len > 0 && (buf[len - 1] == '\n' || buf[len - 1] == '\r')) {
    --len;
  }
  buf[len] = '\0';
  return len;
}

static void readline(char *buf, size_t cap) {
  __wasi_iovec_t iov = { buf, cap };
  size_t nread = 0;
  __wasi_fd_read(0, &iov, 1, &nread);
  trimnewline(buf, nread);
}

__attribute__((export_name("_start")))
void _start(void) {
  char line[256];

  writestr("Hello from wanix REPL!\n");
  writestr("What is your name? ");
  readline(line, sizeof(line));
  writestr("Hello, ");
  {
    __wasi_ciovec_t iov = { line, slen(line) };
    size_t nwritten = 0;
    __wasi_fd_write(1, &iov, 1, &nwritten);
  }
  writestr("!\n");

  writestr("Say something: ");
  readline(line, sizeof(line));
  writestr("You said: ");
  {
    __wasi_ciovec_t iov = { line, slen(line) };
    size_t nwritten = 0;
    __wasi_fd_write(1, &iov, 1, &nwritten);
  }
  writestr("\n");
}
