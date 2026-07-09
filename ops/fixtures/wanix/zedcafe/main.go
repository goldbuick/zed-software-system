//go:build js && wasm

package main

import (
	"log"

	"tractor.dev/wanix/gojs"
)

func main() {
	exportfs := NewEmptyExport()
	log.Printf("zed-cafe export: mounting empty export fs")
	if err := gojs.Export(exportfs, false); err != nil {
		log.Fatal(err)
	}
	select {}
}
