//go:build js && wasm

package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"

	"zed.cafe/wanix-fixtures/findplayers"
)

func main() {
	fsys := os.DirFS(".")
	if _, err := findplayers.ResolveExportRoot(fsys, findplayers.DefaultExportRoots); err != nil {
		fmt.Fprintln(os.Stderr, "waiting for zedcafe export...")
	}
	_, report, err := findplayers.WaitExportScan(
		fsys,
		findplayers.DefaultExportRoots,
		findplayers.ExportReadyTimeout,
		findplayers.ExportReadyPoll,
	)
	if err != nil {
		if errors.Is(err, findplayers.ErrExportNotReady) {
			fmt.Println(err.Error())
		} else {
			fmt.Printf("findplayers: %v\n", err)
		}
		os.Exit(1)
	}
	paths := report.PlayerPaths
	if paths == nil {
		paths = []string{}
	}
	raw, err := json.Marshal(paths)
	if err != nil {
		fmt.Printf("findplayers: encode: %v\n", err)
		os.Exit(1)
	}
	fmt.Println(string(raw))
}
