//go:build js && wasm

package main

import (
	"fmt"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"zed.cafe/wanix-fixtures/findplayers"
	"zed.cafe/wanix-fixtures/zedsync"
)

func main() {
	defer fmt.Println("zedsync: stopped")

	if len(os.Args) < 2 || strings.TrimSpace(os.Args[1]) == "" {
		fmt.Fprintln(os.Stderr, "usage: zedsync.wasm <targetpath>")
		fmt.Fprintln(os.Stderr, "targetpath must not contain spaces (wanix cmd is space-split)")
		os.Exit(1)
	}
	target := strings.TrimSpace(os.Args[1])
	if strings.ContainsAny(target, " \t\n") {
		fmt.Fprintln(os.Stderr, "zedsync: targetpath must not contain spaces")
		os.Exit(1)
	}
	if target == zedsync.ZedcafeMount || target == "./"+zedsync.ZedcafeMount {
		fmt.Fprintln(os.Stderr, "zedsync: targetpath must not be zedcafe")
		os.Exit(1)
	}

	fsys := os.DirFS(".")
	fmt.Println("zedsync: waiting for zedcafe export...")
	zedroot, err := findplayers.WaitExportRoot(
		fsys,
		findplayers.DefaultExportRoots,
		findplayers.ExportReadyTimeout,
		findplayers.ExportReadyPoll,
	)
	if err != nil {
		fmt.Println(err.Error())
		os.Exit(1)
	}
	fmt.Printf("zedsync: zedcafe ready at %s\n", zedroot)

	if err := zedsync.WaitDirExists(target, findplayers.ExportReadyTimeout, findplayers.ExportReadyPoll); err != nil {
		fmt.Fprintf(os.Stderr, "zedsync: target %s: %v\n", target, err)
		os.Exit(1)
	}

	r, err := zedsync.WalkFiles(target)
	if err != nil {
		fmt.Fprintf(os.Stderr, "zedsync: walk remote: %v\n", err)
		os.Exit(1)
	}
	z, err := zedsync.WalkFiles(zedroot)
	if err != nil {
		fmt.Fprintf(os.Stderr, "zedsync: walk zedcafe: %v\n", err)
		os.Exit(1)
	}
	n, err := zedsync.InitialSeed(target, zedroot, r, z)
	if err != nil {
		fmt.Fprintf(os.Stderr, "zedsync: seed: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("zedsync: seed copied %d file(s)\n", n)

	baseline, err := zedsync.WalkFiles(target)
	if err != nil {
		fmt.Fprintf(os.Stderr, "zedsync: baseline remote: %v\n", err)
		os.Exit(1)
	}
	z2, err := zedsync.WalkFiles(zedroot)
	if err != nil {
		fmt.Fprintf(os.Stderr, "zedsync: baseline zedcafe: %v\n", err)
		os.Exit(1)
	}
	for rel, m := range z2 {
		if _, ok := baseline[rel]; !ok {
			baseline[rel] = m
		}
	}

	if err := zedsync.WriteReadySentinel(target); err != nil {
		fmt.Fprintf(os.Stderr, "zedsync: ready sentinel: %v\n", err)
		os.Exit(1)
	}
	fmt.Println("zedsync: seed complete; watching")

	sigc := make(chan os.Signal, 1)
	signal.Notify(sigc, syscall.SIGINT, syscall.SIGTERM)

	ticker := time.NewTicker(zedsync.PollInterval)
	defer ticker.Stop()
	for {
		select {
		case <-sigc:
			return
		case <-ticker.C:
			next, logs, err := zedsync.SteadyTick(target, zedroot, baseline)
			if err != nil {
				fmt.Fprintf(os.Stderr, "zedsync: tick: %v\n", err)
				continue
			}
			baseline = next
			for _, line := range logs {
				fmt.Printf("zedsync: %s\n", line)
			}
		}
	}
}
