//go:build js && wasm

package main

import (
	"errors"
	"fmt"
	"os"
	"strings"
	"time"

	"zed.cafe/wanix-fixtures/findplayers"
	"zed.cafe/wanix-fixtures/greenring"
)

func main() {
	fsys := os.DirFS(".")
	if _, err := findplayers.ResolveExportRoot(fsys, findplayers.DefaultExportRoots); err != nil {
		fmt.Fprintln(os.Stderr, "waiting for zedcafe export...")
	}
	deadline := time.Now().Add(findplayers.ExportReadyTimeout)
	root, report, err := findplayers.WaitExportScan(
		fsys,
		findplayers.DefaultExportRoots,
		findplayers.ExportReadyTimeout,
		findplayers.ExportReadyPoll,
	)
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
	var painted int
	var writelogs []string
	for {
		painted, writelogs, err = greenring.ApplyRingsForPlayers(writeroot, targets)
		if err == nil || !errors.Is(err, findplayers.ErrExportNotReady) {
			break
		}
		if !time.Now().Before(deadline) {
			break
		}
		time.Sleep(findplayers.ExportReadyPoll)
	}
	for _, line := range writelogs {
		fmt.Println("greenring:", line)
	}
	if err != nil {
		fmt.Printf("greenring: write failed: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf(`{"painted":%d}`+"\n", painted)
}
