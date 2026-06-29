/*
 * WASI task: walk ./zed-cafe/ and print a tree listing to stdout.
 * Drag-drop fixture — same namespace as zedcaferead (task ./zed-cafe/, not VM /zed-cafe/).
 *
 * Success: "zed-cafe list" banner + lines like "  stats.json"
 * Failure: "zed-cafe missing\n" when zed-cafe/ is not mounted
 */
typedef unsigned int size_t;
typedef unsigned long long __wasi_dircookie_t;
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

__attribute__((import_module("wasi_snapshot_preview1"), import_name("fd_readdir")))
__wasi_errno_t __wasi_fd_readdir(
  __wasi_fd_t fd,
  void *buf,
  size_t buf_len,
  __wasi_dircookie_t cookie,
  size_t *bufused);

__attribute__((import_module("wasi_snapshot_preview1"), import_name("fd_close")))
__wasi_errno_t __wasi_fd_close(__wasi_fd_t fd);

__attribute__((import_module("wasi_snapshot_preview1"), import_name("proc_exit")))
void __wasi_proc_exit(unsigned int exitcode) __attribute__((noreturn));

#define PREOPEN_CWD 3
#define OFLAGS_DIRECTORY 2
#define FILETYPE_DIRECTORY 3
#define DIR_RIGHTS 1610612736ULL
#define PATH_MAX 512
#define READDIR_BUF 2048

static void write_bytes(const char *buf, size_t len) {
  __wasi_ciovec_t iov = { buf, len };
  size_t nwritten = 0;
  __wasi_fd_write(1, &iov, 1, &nwritten);
}

static void write_str(const char *msg) {
  size_t n = 0;
  while (msg[n] != '\0') {
    ++n;
  }
  write_bytes(msg, n);
}

static void write_indent(unsigned int depth) {
  char spaces[32];
  unsigned int n = depth * 2;
  if (n > sizeof(spaces)) {
    n = sizeof(spaces);
  }
  for (unsigned int i = 0; i < n; ++i) {
    spaces[i] = ' ';
  }
  write_bytes(spaces, n);
}

static __wasi_errno_t open_dir(const char *path, size_t path_len, __wasi_fd_t *opened) {
  return __wasi_path_open(
    PREOPEN_CWD,
    0,
    path,
    path_len,
    OFLAGS_DIRECTORY,
    DIR_RIGHTS,
    0,
    0,
    opened);
}

static void walk_dir(const char *path, size_t path_len, unsigned int depth);

static void walk_dir(const char *path, size_t path_len, unsigned int depth) {
  __wasi_fd_t dirfd = 0;
  if (open_dir(path, path_len, &dirfd) != 0) {
    return;
  }

  unsigned char readdir_buf[READDIR_BUF];
  __wasi_dircookie_t cookie = 0;

  while (1) {
    size_t bufused = 0;
    __wasi_errno_t err = __wasi_fd_readdir(
      dirfd,
      readdir_buf,
      sizeof(readdir_buf),
      cookie,
      &bufused);
    if (err != 0 || bufused == 0) {
      break;
    }

    size_t offset = 0;
    while (offset + 24 <= bufused) {
      unsigned char *head = readdir_buf + offset;
      __wasi_dircookie_t next = *(unsigned long long *)(head + 0);
      unsigned int namlen = *(unsigned int *)(head + 16);
      unsigned char dtype = head[20];
      size_t name_start = offset + 24;
      if (name_start + namlen > bufused) {
        break;
      }
      const char *name = (const char *)(readdir_buf + name_start);

      if (!(namlen == 1 && name[0] == '.') &&
          !(namlen == 2 && name[0] == '.' && name[1] == '.')) {
        write_indent(depth);
        write_bytes(name, namlen);
        if (dtype == FILETYPE_DIRECTORY) {
          write_str("/\n");
          if (path_len + 1 + namlen + 1 < PATH_MAX) {
            char child[PATH_MAX];
            for (size_t i = 0; i < path_len; ++i) {
              child[i] = path[i];
            }
            child[path_len] = '/';
            for (size_t i = 0; i < namlen; ++i) {
              child[path_len + 1 + i] = name[i];
            }
            size_t child_len = path_len + 1 + namlen;
            walk_dir(child, child_len, depth + 1);
          }
        } else {
          write_str("\n");
        }
      }

      cookie = next;
      offset = name_start + namlen;
    }

    if (bufused < sizeof(readdir_buf)) {
      break;
    }
  }

  __wasi_fd_close(dirfd);
}

__attribute__((export_name("_start")))
void _start(void) {
  const char *root = "zed-cafe";
  __wasi_fd_t probe = 0;
  if (open_dir(root, 8, &probe) != 0) {
    write_str("zed-cafe missing\n");
    __wasi_proc_exit(1);
  }
  __wasi_fd_close(probe);

  write_str("zed-cafe list\n");
  write_str("zed-cafe/\n");
  walk_dir(root, 8, 1);

  while (1) {
  }
}
