//go:build js && wasm

package main

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"zed.cafe/wanix-fixtures/findplayers"
	"zed.cafe/wanix-fixtures/greenring"
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
	exportfs, err := findplayers.OpenExportFS(fsys, root)
	if err != nil {
		fmt.Printf("greenring: open export root: %v\n", err)
		os.Exit(1)
	}
	report, err := findplayers.Scan(exportfs, filepath.Base(root))
	if err != nil {
		if errors.Is(err, findplayers.ErrExportNotReady) {
			fmt.Println(err.Error())
		} else {
			fmt.Printf("greenring: %v\n", err)
		}
		os.Exit(1)
	}

	targets := make([]greenring.PlayerXY, 0)
	for _, p := range report.Players {
		if !p.Onboard || p.X == nil || p.Y == nil || p.Book == "" {
			continue
		}
		pagedir := p.Page
		if p.Board != "" {
			pagedir = p.Board
		}
		if pagedir == "" {
			continue
		}
		targets = append(targets, greenring.PlayerXY{
			Book:     p.Book,
			Page:     pagedir,
			PlayerID: p.ID,
			X:        *p.X,
			Y:        *p.Y,
		})
	}
	if len(targets) == 0 {
		fmt.Println(`{"painted":0,"message":"no onboard players with coordinates"}`)
		return
	}

	writeroot := strings.TrimPrefix(root, "./")
	painted, writelogs, err := greenring.ApplyRingsForPlayers(writeroot, targets)
	for _, line := range writelogs {
		fmt.Println("greenring:", line)
	}
	if err != nil {
		fmt.Printf("greenring: write failed: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf(`{"painted":%d}`+"\n", painted)
}
