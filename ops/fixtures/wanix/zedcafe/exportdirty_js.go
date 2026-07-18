//go:build js

package main

import "syscall/js"

func defaultdirtynotify(paths []string) {
	pathvals := make([]any, len(paths))
	for i, path := range paths {
		pathvals[i] = path
	}
	js.Global().Get("self").Call("postMessage", map[string]any{
		"zedcafeexportdirty": true,
		"paths":              pathvals,
	})
}
