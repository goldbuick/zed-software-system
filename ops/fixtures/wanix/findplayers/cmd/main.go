//go:build js && wasm

package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"

	"zed.cafe/wanix-fixtures/findplayers"
)

func main() {
	fsys := os.DirFS(".")
	if _, err := findplayers.ResolveExportRoot(fsys, findplayers.DefaultExportRoots); err != nil {
		fmt.Fprintln(os.Stderr, "waiting for zedcafe export...")
	}
	root, err := findplayers.WaitExportRoot(
		fsys,
		findplayers.DefaultExportRoots,
		findplayers.ExportReadyTimeout,
		findplayers.ExportReadyPoll,
	)
	if err != nil {
		fmt.Println(err.Error())
		os.Exit(1)
	}
	report, err := findplayers.Scan(os.DirFS(root), filepath.Base(root))
	if err != nil {
		if errors.Is(err, findplayers.ErrExportNotReady) {
			fmt.Println(err.Error())
		} else {
			fmt.Printf("findplayers: %v\n", err)
		}
		os.Exit(1)
	}
	raw, err := json.Marshal(report)
	if err != nil {
		fmt.Printf("findplayers: encode: %v\n", err)
		os.Exit(1)
	}
	fmt.Println(string(raw))
}
