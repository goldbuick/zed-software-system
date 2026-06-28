;; WASI task: overwrite zed-cafe/stats.json with guestTouch marker (same as zedcafewrite.c).
(module
  (import "wasi_snapshot_preview1" "fd_write" (func $fd_write (param i32 i32 i32 i32) (result i32)))
  (import "wasi_snapshot_preview1" "path_open" (func $path_open (param i32 i32 i32 i32 i32 i64 i64 i32 i32) (result i32)))
  (import "wasi_snapshot_preview1" "fd_close" (func $fd_close (param i32) (result i32)))
  (import "wasi_snapshot_preview1" "proc_exit" (func $proc_exit (param i32)))

  (memory (export "memory") 2)

  (data (i32.const 512) "zed-cafe/stats.json")
  (data (i32.const 544) "{\"exportedAt\":\"guest\",\"bookCount\":0,\"books\":[],\"guestTouch\":true}\n")
  (data (i32.const 640) "zed-cafe write fail\n")
  (data (i32.const 672) "zed-cafe write ok\n")

  (func $write_at (param $ptr i32) (param $len i32)
    (i32.store (i32.const 0) (local.get $ptr))
    (i32.store (i32.const 4) (local.get $len))
    (drop (call $fd_write (i32.const 1) (i32.const 0) (i32.const 1) (i32.const 8)))
  )

  (func $write_fd (param $fd i32) (param $ptr i32) (param $len i32)
    (i32.store (i32.const 0) (local.get $ptr))
    (i32.store (i32.const 4) (local.get $len))
    (drop (call $fd_write (local.get $fd) (i32.const 0) (i32.const 1) (i32.const 8)))
  )

  (func (export "_start")
    (local $fd i32)
    (local $err i32)
    (local $nwritten i32)

    (local.set $err
      (call $path_open
        (i32.const 3)
        (i32.const 0)
        (i32.const 512)
        (i32.const 19)
        (i32.const 65)
        (i64.const 64)
        (i64.const 0)
        (i32.const 0)
        (i32.const 16)
      )
    )
    (if (i32.ne (local.get $err) (i32.const 0))
      (then
        (call $write_at (i32.const 640) (i32.const 20))
        (call $proc_exit (i32.const 1))
      )
    )
    (local.set $fd (i32.load (i32.const 16)))
    (i32.store (i32.const 0) (i32.const 544))
    (i32.store (i32.const 4) (i32.const 66))
    (local.set $nwritten (i32.const 0))
    (local.set $err
      (call $fd_write (local.get $fd) (i32.const 0) (i32.const 1) (i32.const 24))
    )
    (drop (call $fd_close (local.get $fd)))
    (if (i32.or
          (i32.ne (local.get $err) (i32.const 0))
          (i32.eq (i32.load (i32.const 24)) (i32.const 0)))
      (then
        (call $write_at (i32.const 640) (i32.const 20))
        (call $proc_exit (i32.const 1))
      )
    )
    (call $write_at (i32.const 672) (i32.const 18))
    (call $proc_exit (i32.const 0))
  )
)
