module zed.cafe/zed-cafe

go 1.25.0

replace tractor.dev/wanix => ../../../../submodules/wanix

replace github.com/hugelgupf/p9 => github.com/progrium/p9 v0.0.0-20260529042029-b49ec572080f

replace golang.org/x/sys => github.com/progrium/sys-wasm v0.0.0-20240620081741-5ccc4fc17421

replace github.com/fxamacker/cbor/v2 => ../../../../submodules/wanix/misc/cbor

require tractor.dev/wanix v0.0.0

require (
	github.com/hugelgupf/p9 v0.3.1-0.20240118043522-6f4f11e5296e // indirect
	github.com/u-root/uio v0.0.0-20240224005618-d2acac8f3701 // indirect
	golang.org/x/sys v0.43.0 // indirect
	tractor.dev/toolkit-go v0.0.0-20250103001615-9a6753936c19 // indirect
)
