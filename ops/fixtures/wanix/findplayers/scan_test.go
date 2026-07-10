package findplayers

import (
	"errors"
	"testing"
	"testing/fstest"
)

func TestScanEmptyExport(t *testing.T) {
	fsys := fstest.MapFS{
		"stats.json": &fstest.MapFile{
			Data: []byte(`{"exportedAt":"t","bookCount":0,"books":[]}` + "\n"),
		},
	}
	report, err := Scan(fsys, "zedcafe")
	if err != nil {
		t.Fatal(err)
	}
	if report.PlayerCount != 0 {
		t.Fatalf("expected 0 players, got %d", report.PlayerCount)
	}
	if len(report.PlayerPaths) != 0 {
		t.Fatalf("expected no player paths, got %v", report.PlayerPaths)
	}
	if report.ExportRoot != "zedcafe" {
		t.Fatalf("export root: %q", report.ExportRoot)
	}
}

func TestScanExportNotReady(t *testing.T) {
	_, err := Scan(fstest.MapFS{}, "zedcafe")
	if !errors.Is(err, ErrExportNotReady) {
		t.Fatalf("expected ErrExportNotReady, got %v", err)
	}
}

func TestScanActiveListOnly(t *testing.T) {
	fsys := fstest.MapFS{
		"stats.json": &fstest.MapFile{
			Data: []byte(`{"books":[{"id":"book1","name":"main"}]}` + "\n"),
		},
		"main-book1/stats.json": &fstest.MapFile{
			Data: []byte(`{
  "activelist": ["pid_1111_aaaa"],
  "flags": {
    "pid_1111_aaaa": {"user": "guest", "board": "title-page1"}
  }
}` + "\n"),
		},
	}
	report, err := Scan(fsys, "zedcafe")
	if err != nil {
		t.Fatal(err)
	}
	if report.PlayerCount != 1 {
		t.Fatalf("player count: %d", report.PlayerCount)
	}
	p := report.Players[0]
	if !p.Active || p.Onboard {
		t.Fatalf("expected active roster only: %+v", p)
	}
	if p.Board != "title-page1" {
		t.Fatalf("board flag: %q", p.Board)
	}
	if len(report.PlayerPaths) != 1 || report.PlayerPaths[0] != "main-book1/stats.json" {
		t.Fatalf("player paths: %v", report.PlayerPaths)
	}
}

func TestScanBoardOrphanOnly(t *testing.T) {
	fsys := fstest.MapFS{
		"stats.json": &fstest.MapFile{
			Data: []byte(`{"books":[]}` + "\n"),
		},
		"main-book1/stats.json": &fstest.MapFile{
			Data: []byte(`{"activelist":[],"flags":{}}` + "\n"),
		},
		"main-book1/title-page1/board/objects/pid_2222_bbbb.json": &fstest.MapFile{
			Data: []byte(`{"kind":"player","id":"pid_2222_bbbb","x":4,"y":7}` + "\n"),
		},
	}
	report, err := Scan(fsys, "zedcafe")
	if err != nil {
		t.Fatal(err)
	}
	if report.PlayerCount != 1 {
		t.Fatalf("player count: %d", report.PlayerCount)
	}
	p := report.Players[0]
	if p.Active || !p.Onboard {
		t.Fatalf("expected onboard orphan: %+v", p)
	}
	if p.X == nil || *p.X != 4 || p.Y == nil || *p.Y != 7 {
		t.Fatalf("position: %+v", p)
	}
	wantpath := "main-book1/title-page1/board/objects/pid_2222_bbbb.json"
	if len(report.PlayerPaths) != 1 || report.PlayerPaths[0] != wantpath {
		t.Fatalf("player paths: %v", report.PlayerPaths)
	}
}

func TestScanMergedActiveAndOnboard(t *testing.T) {
	fsys := fstest.MapFS{
		"stats.json": &fstest.MapFile{
			Data: []byte(`{"books":[{"id":"book1","name":"main"}]}` + "\n"),
		},
		"main-book1/stats.json": &fstest.MapFile{
			Data: []byte(`{
  "activelist": ["pid_3333_cccc"],
  "flags": {
    "pid_3333_cccc": {"user": "op", "board": "title-page1"}
  }
}` + "\n"),
		},
		"main-book1/title-page1/board/objects/pid_3333_cccc.json": &fstest.MapFile{
			Data: []byte(`{"kind":"player","id":"pid_3333_cccc","x":10,"y":12}` + "\n"),
		},
	}
	report, err := Scan(fsys, "zedcafe")
	if err != nil {
		t.Fatal(err)
	}
	if report.PlayerCount != 1 {
		t.Fatalf("player count: %d", report.PlayerCount)
	}
	p := report.Players[0]
	if !p.Active || !p.Onboard {
		t.Fatalf("expected merged player: %+v", p)
	}
	if p.Page != "title-page1" {
		t.Fatalf("page: %q", p.Page)
	}
	if len(report.PlayerPaths) != 2 {
		t.Fatalf("player paths: %v", report.PlayerPaths)
	}
}

func TestScanObjectElementPlayer(t *testing.T) {
	fsys := fstest.MapFS{
		"stats.json": &fstest.MapFile{
			Data: []byte(`{"exportedAt":"t","bookCount":1,"books":[]}` + "\n"),
		},
		"main-book1/stats.json": &fstest.MapFile{
			Data: []byte(`{"activelist":[],"flags":{}}` + "\n"),
		},
		"main-book1/player-sid_q8uHjK2to8P/object/element.json": &fstest.MapFile{
			Data: []byte(`{"kind":"player","id":"pid_7294_4alo8kn5141bhen2","x":0,"y":0}` + "\n"),
		},
	}
	report, err := Scan(fsys, "zedcafe")
	if err != nil {
		t.Fatal(err)
	}
	wantpath := "main-book1/player-sid_q8uHjK2to8P/object/element.json"
	if len(report.PlayerPaths) != 1 || report.PlayerPaths[0] != wantpath {
		t.Fatalf("player paths: %v", report.PlayerPaths)
	}
	if report.PlayerCount != 1 {
		t.Fatalf("player count: %d", report.PlayerCount)
	}
}

func TestScanMultiplePlayersSorted(t *testing.T) {
	fsys := fstest.MapFS{
		"stats.json": &fstest.MapFile{Data: []byte(`{"books":[]}` + "\n")},
		"demo-book1/stats.json": &fstest.MapFile{
			Data: []byte(`{"activelist":["pid_zzz_zzz","pid_aaa_aaa"],"flags":{}}` + "\n"),
		},
	}
	report, err := Scan(fsys, "zedcafe")
	if err != nil {
		t.Fatal(err)
	}
	if report.PlayerCount != 2 {
		t.Fatalf("player count: %d", report.PlayerCount)
	}
	if report.Players[0].ID != "pid_aaa_aaa" || report.Players[1].ID != "pid_zzz_zzz" {
		t.Fatalf("sort order: %+v", report.Players)
	}
}
