//go:build wasip1

package main

import (
	"encoding/json"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

func main() {
	inputpath, err := resolveinputpng(os.Args[1:])
	if err != nil {
		fmt.Fprintf(os.Stderr, "input2terrain: %v\n", err)
		os.Exit(1)
	}
	info, err := os.Stat(inputpath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "input2terrain: missing %s: %v\n", inputpath, err)
		os.Exit(1)
	}
	terraindir, err := findterraindir("zedcafe")
	if err != nil {
		fmt.Fprintf(os.Stderr, "input2terrain: %v\n", err)
		os.Exit(1)
	}
	n := int(info.Size()%40) + 1
	for i := 0; i < n; i++ {
		cell := map[string]string{"kind": "solid"}
		raw, err := json.Marshal(cell)
		if err != nil {
			fmt.Fprintf(os.Stderr, "input2terrain: encode: %v\n", err)
			os.Exit(1)
		}
		raw = append(raw, '\n')
		cellpath := filepath.Join(terraindir, strconv.Itoa(i)+".json")
		if err := os.WriteFile(cellpath, raw, 0o644); err != nil {
			fmt.Fprintf(os.Stderr, "input2terrain: write %s: %v\n", cellpath, err)
			os.Exit(1)
		}
	}
	fmt.Printf(
		"input2terrain: wrote %s/0.json..%d.json (%d cells from %s, %d bytes)\n",
		terraindir,
		n-1,
		n,
		filepath.Base(inputpath),
		info.Size(),
	)
}

func resolveinputpng(args []string) (string, error) {
	if len(args) > 0 && strings.TrimSpace(args[0]) != "" {
		base := filepath.Base(strings.TrimSpace(args[0]))
		return filepath.Join("input", base), nil
	}
	entries, err := os.ReadDir("input")
	if err != nil {
		return "", fmt.Errorf("read input/: %w", err)
	}
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		name := entry.Name()
		if strings.HasSuffix(strings.ToLower(name), ".png") {
			return filepath.Join("input", name), nil
		}
	}
	return "", fmt.Errorf("no .png under input/ (drop stamp-red/green/blue.png while attached)")
}

func findterraindir(root string) (string, error) {
	var found string
	walkerr := filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil
		}
		base := filepath.Base(path)
		if base != "0.json" {
			return nil
		}
		parent := filepath.Base(filepath.Dir(path))
		if parent != "terrain" {
			return nil
		}
		grand := filepath.Base(filepath.Dir(filepath.Dir(path)))
		if grand != "board" {
			return nil
		}
		found = filepath.Dir(path)
		return fs.SkipAll
	})
	if walkerr != nil && walkerr != fs.SkipAll {
		return "", walkerr
	}
	if found == "" {
		return "", fmt.Errorf("no board/terrain/0.json under %s/", root)
	}
	return found, nil
}
