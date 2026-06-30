package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

func walkdir(path string, depth int, w interface{ Write([]byte) (int, error) }) error {
	entries, err := os.ReadDir(path)
	if err != nil {
		return err
	}
	for _, entry := range entries {
		indent := strings.Repeat(" ", depth*2)
		name := entry.Name()
		if entry.IsDir() {
			_, _ = fmt.Fprintf(w, "%s%s/\n", indent, name)
			if err := walkdir(filepath.Join(path, name), depth+1, w); err != nil {
				return err
			}
			continue
		}
		_, _ = fmt.Fprintf(w, "%s%s\n", indent, name)
	}
	return nil
}

func main() {
	if _, err := os.Stat("zedcafe"); err != nil {
		_, _ = fmt.Fprint(os.Stdout, "zed-cafe missing\n")
		os.Exit(1)
	}

	_, _ = fmt.Fprint(os.Stdout, "zed-cafe list\n")
	_, _ = fmt.Fprint(os.Stdout, "zedcafe/\n")
	if err := walkdir("zedcafe", 1, os.Stdout); err != nil {
		_, _ = fmt.Fprint(os.Stdout, "zed-cafe missing\n")
		os.Exit(1)
	}

	for {
	}
}
