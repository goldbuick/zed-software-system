package findplayers

import (
	"testing"
	"testing/fstest"
)

func TestOpenExportFSNestedRoot(t *testing.T) {
	fsys := fstest.MapFS{
		"zedcafe/stats.json": &fstest.MapFile{
			Data: []byte(`{"exportedAt":"t","bookCount":0,"books":[]}` + "\n"),
		},
	}
	exportfs, err := OpenExportFS(fsys, "zedcafe")
	if err != nil {
		t.Fatal(err)
	}
	report, err := Scan(exportfs, "zedcafe")
	if err != nil {
		t.Fatal(err)
	}
	if report.ExportRoot != "zedcafe" {
		t.Fatalf("export root: %q", report.ExportRoot)
	}
}

func TestOpenExportFSRamfsRoot(t *testing.T) {
	fsys := fstest.MapFS{
		"#ramfs/zedcafe/stats.json": &fstest.MapFile{
			Data: []byte(`{"exportedAt":"t","bookCount":0,"books":[]}` + "\n"),
		},
	}
	exportfs, err := OpenExportFS(fsys, "#ramfs/zedcafe")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := Scan(exportfs, "zedcafe"); err != nil {
		t.Fatal(err)
	}
}
