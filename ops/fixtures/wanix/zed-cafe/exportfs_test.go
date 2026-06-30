//go:build !js

package main

import (
	"encoding/base64"
	"strings"
	"testing"

	"tractor.dev/wanix/fs"
)

func TestExportFromPayloadRejectsInvalidCreate(t *testing.T) {
	seed := `{"exportedAt":"test","bookCount":0,"books":[]}`
	payload := inboxpayload{
		Files: []inboxentry{
			{
				Path: "stats.json",
				Data: base64.StdEncoding.EncodeToString([]byte(seed + "\n")),
			},
		},
	}
	exportfs, err := NewExportFromPayload(payload)
	if err != nil {
		t.Fatal(err)
	}
	_, err = fs.Create(exportfs, "evil.txt")
	if err == nil {
		t.Fatal("expected guarded ExportFS to reject evil.txt")
	}
}

func TestExportFromPayloadCreateWrite(t *testing.T) {
	seed := `{"exportedAt":"test","bookCount":0,"books":[]}`
	payload := inboxpayload{
		Files: []inboxentry{
			{
				Path: "stats.json",
				Data: base64.StdEncoding.EncodeToString([]byte(seed + "\n")),
			},
		},
	}
	exportfs, err := NewExportFromPayload(payload)
	if err != nil {
		t.Fatal(err)
	}
	initial, err := fs.ReadFile(exportfs, "stats.json")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(initial), `"bookCount":0`) {
		t.Fatalf("initial stats unexpected: %q", string(initial))
	}

	written := `{"exportedAt":"guest","bookCount":0,"books":[],"guestTouch":true}` + "\n"
	file, err := fs.Create(exportfs, "stats.json")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := fs.Write(file, []byte(written)); err != nil {
		t.Fatal(err)
	}
	if err := file.Close(); err != nil {
		t.Fatal(err)
	}

	got, err := fs.ReadFile(exportfs, "stats.json")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(got), `"guestTouch":true`) {
		t.Fatalf("write round-trip failed: %q", string(got))
	}
}
