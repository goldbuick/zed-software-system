//go:build js && wasm

package main

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io/fs"
	"log"
	"os"

	"tractor.dev/wanix/fs/fskit"
	"tractor.dev/wanix/gojs"
)

const inboxpath = "zed-cafe-inbox.json"

type inboxentry struct {
	Path string `json:"path"`
	Data string `json:"data"`
}

type inboxpayload struct {
	Files []inboxentry `json:"files"`
}

func main() {
	exportfs, err := buildinboxexport()
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

func buildinboxexport() (fs.FS, error) {
	raw, err := readinboxfile()
	if err != nil {
		return nil, err
	}
	var payload inboxpayload
	if err := json.Unmarshal(raw, &payload); err != nil {
		return nil, err
	}
	nodes := fskit.MapFS{}
	for _, entry := range payload.Files {
		data, err := base64.StdEncoding.DecodeString(entry.Data)
		if err != nil {
			return nil, err
		}
		nodes[entry.Path] = fskit.RawNode(data)
	}
	return nodes, nil
}
