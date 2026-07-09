//go:build wasip1

package main

import (
	"encoding/json"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
)

const inputpath = "input/stamp.png"

func main() {
	info, err := os.Stat(inputpath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "input2terrain: missing %s: %v\n", inputpath, err)
		os.Exit(1)
	}
	terrainpath, err := findterrainpath("zedcafe")
	if err != nil {
		fmt.Fprintf(os.Stderr, "input2terrain: %v\n", err)
		os.Exit(1)
	}
	n := int(info.Size()%40) + 1
	cells := make([]map[string]string, n)
	for i := 0; i < n; i++ {
		cells[i] = map[string]string{"kind": "solid"}
	}
	raw, err := json.Marshal(cells)
	if err != nil {
		fmt.Fprintf(os.Stderr, "input2terrain: encode: %v\n", err)
		os.Exit(1)
	}
	raw = append(raw, '\n')
	if err := os.WriteFile(terrainpath, raw, 0o644); err != nil {
		fmt.Fprintf(os.Stderr, "input2terrain: write %s: %v\n", terrainpath, err)
		os.Exit(1)
	}
	fmt.Printf(
		"input2terrain: wrote %s (%d cells from %d byte png)\n",
		terrainpath,
		n,
		info.Size(),
	)
}

func findterrainpath(root string) (string, error) {
	var found string
	walkerr := filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil
		}
		if strings.HasSuffix(path, string(filepath.Separator)+"board"+string(filepath.Separator)+"terrain.json") ||
			strings.HasSuffix(path, "/board/terrain.json") {
			found = path
			return fs.SkipAll
		}
		return nil
	})
	if walkerr != nil && walkerr != fs.SkipAll {
		return "", walkerr
	}
	if found == "" {
		return "", fmt.Errorf("no board/terrain.json under %s/", root)
	}
	return found, nil
}
