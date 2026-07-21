//go:build js && wasm

package main

import (
	"errors"
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

	fmt.Printf("zedsync: waiting for target dir %s...\n", target)
	if err := zedsync.WaitDirExists(target, findplayers.ExportReadyTimeout, findplayers.ExportReadyPoll); err != nil {
		fmt.Fprintf(os.Stderr, "zedsync: target %s: %v\n", target, err)
		os.Exit(1)
	}
	fmt.Printf("zedsync: target dir ready: %s\n", target)

	replaylogs, err := zedsync.ReplayIncompleteJournal(target, zedroot)
	if err != nil {
		fmt.Fprintf(os.Stderr, "zedsync: replay journal: %v\n", err)
	}
	for _, line := range replaylogs {
		fmt.Printf("zedsync: %s\n", line)
	}
	if cerr := zedsync.CompactJournal(target); cerr != nil {
		fmt.Fprintf(os.Stderr, "zedsync: compact journal: %v\n", cerr)
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

	// Prefer incremental ticks keyed off the host's revision file (see
	// SteadyTickIncremental); start from whatever revision is on disk so a
	// push that landed during seed is not resynced as a full walk.
	lastrev, _, rerr := zedsync.ReadRevision(zedroot)
	if rerr != nil {
		fmt.Fprintf(os.Stderr, "zedsync: read initial revision: %v\n", rerr)
		lastrev = 0
	}

	sigc := make(chan os.Signal, 1)
	signal.Notify(sigc, syscall.SIGINT, syscall.SIGTERM)

	interval := zedsync.PollInterval
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		select {
		case <-sigc:
			return
		case <-ticker.C:
			next, logs, newrev, err := zedsync.SteadyTickIncremental(target, zedroot, baseline, lastrev)
			if errors.Is(err, zedsync.ErrZedsyncNeedFullTick) {
				next, logs, err = zedsync.SteadyTick(target, zedroot, baseline)
				newrev = lastrev
				if rev, _, rrerr := zedsync.ReadRevision(zedroot); rrerr == nil {
					newrev = rev
				}
			}
			if err != nil {
				if len(next) > 0 {
					baseline = next
				}
				fmt.Fprintf(os.Stderr, "zedsync: tick: %v\n", err)
				continue
			}
			baseline = next
			lastrev = newrev
			importkicks := 0
			for _, line := range logs {
				fmt.Printf("zedsync: %s\n", line)
				if strings.Contains(line, "zedcafe <-") {
					importkicks++
				}
			}
			if importkicks > 0 {
				fmt.Printf("zedsync: import-kick paths=%d\n", importkicks)
			}
			// Adaptive poll: 1000ms after changes, back off to 4s idle.
			nextinterval := interval
			if len(logs) > 0 {
				nextinterval = zedsync.PollInterval
			} else if interval < zedsync.PollIdleMax {
				nextinterval = interval * 2
				if nextinterval > zedsync.PollIdleMax {
					nextinterval = zedsync.PollIdleMax
				}
			}
			if nextinterval != interval {
				interval = nextinterval
				ticker.Reset(interval)
			}
		}
	}
}
