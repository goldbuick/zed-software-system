//go:build wasip1

package main

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

const pollinterval = 500 * time.Millisecond

func main() {
	once := len(os.Args) > 1 && strings.EqualFold(strings.TrimSpace(os.Args[1]), "once")
	if once {
		printsnapshot("once")
		return
	}
	var lastfp string
	missinglogged := false
	for {
		fp, lines, err := snapshotinput()
		if err != nil {
			if !missinglogged {
				fmt.Fprintf(os.Stderr, "listinput: waiting for input/: %v\n", err)
				missinglogged = true
			}
			time.Sleep(pollinterval)
			continue
		}
		missinglogged = false
		if fp == lastfp {
			time.Sleep(pollinterval)
			continue
		}
		label := "change"
		if lastfp == "" {
			label = "initial"
		}
		lastfp = fp
		printlines(label, lines)
		time.Sleep(pollinterval)
	}
}

func printsnapshot(label string) {
	_, lines, err := snapshotinput()
	if err != nil {
		fmt.Fprintf(os.Stderr, "listinput: read input/: %v\n", err)
		os.Exit(1)
	}
	printlines(label, lines)
}

func printlines(label string, lines []string) {
	fmt.Printf("listinput: %s\n", label)
	if len(lines) == 0 {
		fmt.Println("listinput: empty")
		return
	}
	names := make([]string, 0, len(lines))
	for _, line := range lines {
		// line is "name:size"
		parts := strings.SplitN(line, ":", 2)
		name := parts[0]
		names = append(names, name)
		size := "?"
		if len(parts) == 2 {
			size = parts[1]
		}
		fmt.Printf("listinput: ok %s (%s bytes)\n", name, size)
	}
	fmt.Printf("listinput: %d file(s): %s\n", len(names), strings.Join(names, ", "))
}

func snapshotinput() (fingerprint string, lines []string, err error) {
	entries, err := os.ReadDir("input")
	if err != nil {
		return "", nil, err
	}
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		name := entry.Name()
		path := filepath.Join("input", name)
		info, staterr := os.Stat(path)
		if staterr != nil {
			lines = append(lines, name+":?")
			continue
		}
		lines = append(lines, fmt.Sprintf("%s:%d", name, info.Size()))
	}
	sort.Strings(lines)
	return strings.Join(lines, "\n"), lines, nil
}
