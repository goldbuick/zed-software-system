const std = @import("std");
const wasi = std.os.wasi;

fn fdwrite(fd: wasi.fd_t, text: []const u8) void {
    const iov = [1]wasi.ciovec_t{.{ .base = text.ptr, .len = text.len }};
    var nwritten: usize = undefined;
    _ = wasi.fd_write(fd, &iov, 1, &nwritten);
}

pub fn main() void {
    fdwrite(1, "Hello from wanix!\n");
}
