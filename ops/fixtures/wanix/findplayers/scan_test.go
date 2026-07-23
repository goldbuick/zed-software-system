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
			Data: []byte(`{"activelist": ["pid_1111_aaaa"]}` + "\n"),
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
	if p.Book != "main-book1" {
		t.Fatalf("book dir: %q (want main-book1, not stats.json)", p.Book)
	}
	if len(report.PlayerPaths) != 1 || report.PlayerPaths[0] != "main-book1/stats.json" {
		t.Fatalf("player paths: %v", report.PlayerPaths)
	}
}

func TestScanFlagsLocateBoardObject(t *testing.T) {
	fsys := fstest.MapFS{
		"stats.json": &fstest.MapFile{
			Data: []byte(`{"books":[]}` + "\n"),
		},
		"main-book1/stats.json": &fstest.MapFile{
			Data: []byte(`{"activelist":["pid_2222_bbbb"]}` + "\n"),
		},
		"main-book1/flags/pid_2222_bbbb.json": &fstest.MapFile{
			Data: []byte(`{"user":"guest","board":"title-page1"}` + "\n"),
		},
		"main-book1/title-page1/board/terrain.json": &fstest.MapFile{
			Data: []byte(`[]` + "\n"),
		},
		"main-book1/title-page1/board/objects/pid_2222_bbbb.json": &fstest.MapFile{
			Data: []byte(`{"kind":"player","id":"pid_2222_bbbb","x":4,"y":7}` + "\n"),
		},
		// Other boards / objects must not be required for discovery.
		"main-book1/other-page2/board/terrain.json": &fstest.MapFile{
			Data: []byte(`[]` + "\n"),
		},
		"main-book1/other-page2/board/objects/npc1.json": &fstest.MapFile{
			Data: []byte(`{"kind":"object","id":"npc1","x":1,"y":1}` + "\n"),
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
		t.Fatalf("expected active+onboard: %+v", p)
	}
	if p.Board != "title-page1" {
		t.Fatalf("board flag: %q", p.Board)
	}
	if p.Page != "title-page1" {
		t.Fatalf("page: %q", p.Page)
	}
	if p.X == nil || *p.X != 4 || p.Y == nil || *p.Y != 7 {
		t.Fatalf("position: %+v", p)
	}
	wantobj := "main-book1/title-page1/board/objects/pid_2222_bbbb.json"
	wantflag := "main-book1/flags/pid_2222_bbbb.json"
	if len(report.PlayerPaths) < 3 {
		t.Fatalf("player paths: %v", report.PlayerPaths)
	}
	foundobj := false
	foundflag := false
	for _, rel := range report.PlayerPaths {
		if rel == wantobj {
			foundobj = true
		}
		if rel == wantflag {
			foundflag = true
		}
	}
	if !foundobj || !foundflag {
		t.Fatalf("player paths missing flag/object: %v", report.PlayerPaths)
	}
}

func TestScanFlagsBoardIdSuffix(t *testing.T) {
	fsys := fstest.MapFS{
		"stats.json": &fstest.MapFile{
			Data: []byte(`{"books":[]}` + "\n"),
		},
		"cool-book1/stats.json": &fstest.MapFile{
			Data: []byte(`{"activelist":["pid_3333_cccc"]}` + "\n"),
		},
		"cool-book1/flags/pid_3333_cccc.json": &fstest.MapFile{
			Data: []byte(`{"board":"sid_abc"}` + "\n"),
		},
		"cool-book1/title-sid_abc/board/terrain.json": &fstest.MapFile{
			Data: []byte(`[]` + "\n"),
		},
		"cool-book1/title-sid_abc/board/objects/pid_3333_cccc.json": &fstest.MapFile{
			Data: []byte(`{"id":"pid_3333_cccc","x":10,"y":12}` + "\n"),
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
	if p.Page != "title-sid_abc" {
		t.Fatalf("page: %q", p.Page)
	}
	if p.X == nil || *p.X != 10 {
		t.Fatalf("x: %+v", p)
	}
}

func TestScanIgnoresNonPidFlagsAndObjects(t *testing.T) {
	fsys := fstest.MapFS{
		"stats.json": &fstest.MapFile{
			Data: []byte(`{"books":[]}` + "\n"),
		},
		"main-book1/stats.json": &fstest.MapFile{
			Data: []byte(`{"activelist":[]}` + "\n"),
		},
		"main-book1/flags/world.json": &fstest.MapFile{
			Data: []byte(`{"board":"title-page1"}` + "\n"),
		},
		"main-book1/flags/pid_1_gadget.json": &fstest.MapFile{
			Data: []byte(`{"board":"title-page1"}` + "\n"),
		},
		"main-book1/title-page1/board/terrain.json": &fstest.MapFile{
			Data: []byte(`[]` + "\n"),
		},
		"main-book1/title-page1/board/objects/npc1.json": &fstest.MapFile{
			Data: []byte(`{"kind":"player","id":"npc1","x":1,"y":2}` + "\n"),
		},
	}
	report, err := Scan(fsys, "zedcafe")
	if err != nil {
		t.Fatal(err)
	}
	if report.PlayerCount != 0 {
		t.Fatalf("expected 0 players, got %+v", report.Players)
	}
}

func TestScanFlagWithoutObjectStaysRosterOnly(t *testing.T) {
	fsys := fstest.MapFS{
		"stats.json": &fstest.MapFile{
			Data: []byte(`{"books":[]}` + "\n"),
		},
		"main-book1/stats.json": &fstest.MapFile{
			Data: []byte(`{"activelist":["pid_4444_dddd"]}` + "\n"),
		},
		"main-book1/flags/pid_4444_dddd.json": &fstest.MapFile{
			Data: []byte(`{"board":"missing-board"}` + "\n"),
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
	if p.Onboard || p.X != nil {
		t.Fatalf("expected roster-only without object: %+v", p)
	}
	if p.Board != "missing-board" {
		t.Fatalf("board: %q", p.Board)
	}
}

func TestScanMultiplePlayersSorted(t *testing.T) {
	fsys := fstest.MapFS{
		"stats.json": &fstest.MapFile{Data: []byte(`{"books":[]}` + "\n")},
		"demo-book1/stats.json": &fstest.MapFile{
			Data: []byte(`{"activelist":["pid_zzz_zzz","pid_aaa_aaa"]}` + "\n"),
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

func TestScanEmptyPlayerObjectNotReady(t *testing.T) {
	fsys := fstest.MapFS{
		"stats.json": &fstest.MapFile{
			Data: []byte(`{"exportedAt":"t","bookCount":1,"books":[]}` + "\n"),
		},
		"main-book1/stats.json": &fstest.MapFile{
			Data: []byte(`{"activelist":["pid_1"]}` + "\n"),
		},
		"main-book1/flags/pid_1.json": &fstest.MapFile{
			Data: []byte(`{"board":"title-page1"}` + "\n"),
		},
		"main-book1/title-page1/board/terrain.json": &fstest.MapFile{
			Data: []byte(`[]` + "\n"),
		},
		"main-book1/title-page1/board/objects/pid_1.json": &fstest.MapFile{
			Data: []byte{},
		},
	}
	_, err := Scan(fsys, "zedcafe")
	if !errors.Is(err, ErrExportNotReady) {
		t.Fatalf("expected ErrExportNotReady, got %v", err)
	}
}

func TestScanTruncatedPlayerObjectNotReady(t *testing.T) {
	fsys := fstest.MapFS{
		"stats.json": &fstest.MapFile{
			Data: []byte(`{"exportedAt":"t","bookCount":1,"books":[]}` + "\n"),
		},
		"main-book1/stats.json": &fstest.MapFile{
			Data: []byte(`{"activelist":["pid_1"]}` + "\n"),
		},
		"main-book1/flags/pid_1.json": &fstest.MapFile{
			Data: []byte(`{"board":"title-page1"}` + "\n"),
		},
		"main-book1/title-page1/board/terrain.json": &fstest.MapFile{
			Data: []byte(`[]` + "\n"),
		},
		"main-book1/title-page1/board/objects/pid_1.json": &fstest.MapFile{
			Data: []byte(`{"kind":"player"`),
		},
	}
	_, err := Scan(fsys, "zedcafe")
	if !errors.Is(err, ErrExportNotReady) {
		t.Fatalf("expected ErrExportNotReady, got %v", err)
	}
}

func TestScanEmptyPlayerFlagNotReady(t *testing.T) {
	fsys := fstest.MapFS{
		"stats.json": &fstest.MapFile{
			Data: []byte(`{"exportedAt":"t","bookCount":1,"books":[]}` + "\n"),
		},
		"main-book1/stats.json": &fstest.MapFile{
			Data: []byte(`{"activelist":["pid_1"]}` + "\n"),
		},
		"main-book1/flags/pid_1.json": &fstest.MapFile{
			Data: []byte{},
		},
	}
	_, err := Scan(fsys, "zedcafe")
	if !errors.Is(err, ErrExportNotReady) {
		t.Fatalf("expected ErrExportNotReady, got %v", err)
	}
}

func TestUnmarshalJSONOrNotReady(t *testing.T) {
	var dest map[string]any
	if err := UnmarshalJSONOrNotReady("x.json", nil, &dest); !errors.Is(err, ErrExportNotReady) {
		t.Fatalf("empty: %v", err)
	}
	if err := UnmarshalJSONOrNotReady("x.json", []byte(`{"a":`), &dest); !errors.Is(err, ErrExportNotReady) {
		t.Fatalf("truncate: %v", err)
	}
	if err := UnmarshalJSONOrNotReady("x.json", []byte(`{"a":1}`), &dest); err != nil {
		t.Fatal(err)
	}
}
