;; WASI task: read zed-cafe/stats.json (same behavior as zedcaferead.c).
(module
  (import "wasi_snapshot_preview1" "fd_write" (func $fd_write (param i32 i32 i32 i32) (result i32)))
  (import "wasi_snapshot_preview1" "fd_read" (func $fd_read (param i32 i32 i32 i32) (result i32)))
  (import "wasi_snapshot_preview1" "path_open" (func $path_open (param i32 i32 i32 i32 i32 i64 i64 i32 i32) (result i32)))
  (import "wasi_snapshot_preview1" "fd_close" (func $fd_close (param i32) (result i32)))
  (import "wasi_snapshot_preview1" "proc_exit" (func $proc_exit (param i32)))

  (memory (export "memory") 2)

  (data (i32.const 512) "zed-cafe/stats.json")
  (data (i32.const 544) "zed-cafe missing\n")
  (data (i32.const 576) "zed-cafe empty\n")
  (data (i32.const 608) "zed-cafe ok: ")
  (data (i32.const 640) "\n")
  (data (i32.const 672) "zed-cafe-read.ok")
  (data (i32.const 704) "ok\n")

  (func $write_fd (param $fd i32) (param $ptr i32) (param $len i32)
    (i32.store (i32.const 0) (local.get $ptr))
    (i32.store (i32.const 4) (local.get $len))
    (drop (call $fd_write (local.get $fd) (i32.const 0) (i32.const 1) (i32.const 8)))
  )

  (func $write_marker
    (local $fd i32)
    (local $err i32)
    (local.set $err
      (call $path_open
        (i32.const 3)
        (i32.const 0)
        (i32.const 672)
        (i32.const 16)
        (i32.const 65)
        (i64.const 64)
        (i64.const 0)
        (i32.const 0)
        (i32.const 48)
      )
    )
    (if (i32.eq (local.get $err) (i32.const 0))
      (then
        (local.set $fd (i32.load (i32.const 48)))
        (call $write_fd (local.get $fd) (i32.const 704) (i32.const 3))
        (drop (call $fd_close (local.get $fd)))
      )
    )
  )

  (func $write_at (param $ptr i32) (param $len i32)
    (i32.store (i32.const 0) (local.get $ptr))
    (i32.store (i32.const 4) (local.get $len))
    (drop (call $fd_write (i32.const 1) (i32.const 0) (i32.const 1) (i32.const 8)))
  )

  (func (export "_start")
    (local $fd i32)
    (local $err i32)
    (local $nread i32)

    (local.set $err
      (call $path_open
        (i32.const 3)
        (i32.const 0)
        (i32.const 512)
        (i32.const 22)
        (i32.const 0)
        (i64.const 2)
        (i64.const 0)
        (i32.const 0)
        (i32.const 16)
      )
    )
    (if (i32.ne (local.get $err) (i32.const 0))
      (then
        (call $write_at (i32.const 544) (i32.const 17))
        (call $proc_exit (i32.const 1))
      )
    )
    (local.set $fd (i32.load (i32.const 16)))

    (i32.store (i32.const 24) (i32.const 64))
    (i32.store (i32.const 28) (i32.const 384))
    (local.set $err
      (call $fd_read
        (local.get $fd)
        (i32.const 24)
        (i32.const 1)
        (i32.const 32)
      )
    )
    (local.set $nread (i32.load (i32.const 32)))
    (drop (call $fd_close (local.get $fd)))

    (if (i32.or
          (i32.ne (local.get $err) (i32.const 0))
          (i32.eq (local.get $nread) (i32.const 0))
        )
      (then
        (call $write_at (i32.const 576) (i32.const 15))
        (call $proc_exit (i32.const 1))
      )
    )

    (call $write_at (i32.const 608) (i32.const 13))
    (call $write_at (i32.const 64) (local.get $nread))
    (call $write_at (i32.const 640) (i32.const 1))
    (call $write_marker)
  )
)
