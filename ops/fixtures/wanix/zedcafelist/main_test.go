package main

import (
	"bytes"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestWalkdirListsNestedTree(t *testing.T) {
	root := t.TempDir()
	cafe := filepath.Join(root, "zedcafe")
	if err := os.MkdirAll(filepath.Join(cafe, "books", "demo"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(cafe, "stats.json"), []byte("{}\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(cafe, "books", "demo", "page.json"), []byte("{}\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	var buf bytes.Buffer
	_, _ = buf.WriteString("zed-cafe list\n")
	_, _ = buf.WriteString("zedcafe/\n")
	if err := walkdir(cafe, 1, &buf); err != nil {
		t.Fatal(err)
	}

	out := buf.String()
	for _, want := range []string{
		"zed-cafe list",
		"zedcafe/",
		"stats.json",
		"books/",
		"demo/",
		"page.json",
	} {
		if !strings.Contains(out, want) {
			t.Fatalf("missing %q in output:\n%s", want, out)
		}
	}
}
