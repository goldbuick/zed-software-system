//go:build js

package main

import "syscall/js"

func defaultdirtynotify() {
	js.Global().Get("self").Call("postMessage", map[string]any{
		"zedcafeexportdirty": true,
	})
}
