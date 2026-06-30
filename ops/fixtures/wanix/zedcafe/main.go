//go:build js && wasm

package main

import (
	"fmt"
	"log"
	"os"

	"tractor.dev/wanix/gojs"
)

const inboxpath = "zedcafeinbox.json"

func main() {
	raw, err := readinboxfile()
	if err != nil {
		log.Fatal(err)
	}
	exportfs, err := NewExportFromInboxJSON(raw)
	if err != nil {
		log.Fatal(err)
	}
	log.Printf("zed-cafe export: inbox ok, calling gojs.Export")
	if err := gojs.Export(exportfs, false); err != nil {
		log.Fatal(err)
	}
	select {}
}

func readinboxfile() ([]byte, error) {
	candidates := []string{
		inboxpath,
		"#ramfs/" + inboxpath,
	}
	var lasterr error
	for _, path := range candidates {
		raw, err := os.ReadFile(path)
		if err == nil {
			log.Printf("zed-cafe export: read %s (%d bytes)", path, len(raw))
			return raw, nil
		}
		lasterr = err
	}
	return nil, fmt.Errorf("read inbox: %w", lasterr)
}
