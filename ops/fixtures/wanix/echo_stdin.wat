(module
  (import "wasi_snapshot_preview1" "fd_read" (func $fd_read (param i32 i32 i32 i32) (result i32)))
  (import "wasi_snapshot_preview1" "fd_write" (func $fd_write (param i32 i32 i32 i32) (result i32)))
  (memory (export "memory") 1)
  (data (i32.const 520) "echo: ")
  (func (export "_start")
    ;; iov for fd_read: buf at 8, len 256
    (i32.store (i32.const 0) (i32.const 8))
    (i32.store (i32.const 4) (i32.const 256))
    (call $fd_read
      (i32.const 0)
      (i32.const 0)
      (i32.const 1)
      (i32.const 264))
    drop
    ;; write "echo: " prefix (6 bytes at 520)
    (i32.store (i32.const 272) (i32.const 520))
    (i32.store (i32.const 276) (i32.const 6))
    (call $fd_write
      (i32.const 1)
      (i32.const 272)
      (i32.const 1)
      (i32.const 280))
    drop
    ;; write read bytes from buf 8, length at 264
    (i32.store (i32.const 272) (i32.const 8))
    (i32.store (i32.const 276) (i32.load (i32.const 264)))
    (call $fd_write
      (i32.const 1)
      (i32.const 272)
      (i32.const 1)
      (i32.const 280))
    drop
  )
)
