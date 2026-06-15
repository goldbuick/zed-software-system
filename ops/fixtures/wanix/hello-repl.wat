(module
  (import "wasi_snapshot_preview1" "fd_read" (func $fd_read (param i32 i32 i32 i32) (result i32)))
  (import "wasi_snapshot_preview1" "fd_write" (func $fd_write (param i32 i32 i32 i32) (result i32)))
  (memory (export "memory") 1)
  (data (i32.const 512) "Hello from wanix REPL!\n")
  (data (i32.const 534) "What is your name? ")
  (data (i32.const 553) "Hello, ")
  (data (i32.const 560) "!\n")
  (data (i32.const 562) "Say something: ")
  (data (i32.const 577) "You said: ")
  (data (i32.const 587) "\n")

  (func $write_bytes (param $ptr i32) (param $len i32)
    (i32.store (i32.const 272) (local.get $ptr))
    (i32.store (i32.const 276) (local.get $len))
    (call $fd_write
      (i32.const 1)
      (i32.const 272)
      (i32.const 1)
      (i32.const 280))
    drop
  )

  (func $read_line
    (i32.store (i32.const 0) (i32.const 8))
    (i32.store (i32.const 4) (i32.const 256))
    (call $fd_read
      (i32.const 0)
      (i32.const 0)
      (i32.const 1)
      (i32.const 264))
    drop
  )

  (func $write_buf
    (i32.store (i32.const 272) (i32.const 8))
    (i32.store (i32.const 276) (i32.load (i32.const 264)))
    (call $fd_write
      (i32.const 1)
      (i32.const 272)
      (i32.const 1)
      (i32.const 280))
    drop
  )

  (func (export "_start")
    (call $write_bytes (i32.const 512) (i32.const 22))
    (call $write_bytes (i32.const 534) (i32.const 19))
    (call $read_line)
    (call $write_bytes (i32.const 553) (i32.const 7))
    (call $write_buf)
    (call $write_bytes (i32.const 560) (i32.const 2))
    (call $write_bytes (i32.const 562) (i32.const 15))
    (call $read_line)
    (call $write_bytes (i32.const 577) (i32.const 10))
    (call $write_buf)
    (call $write_bytes (i32.const 587) (i32.const 1))
  )
)
