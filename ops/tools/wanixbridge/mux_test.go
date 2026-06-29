package main

import (
	"testing"
)

func TestMuxRoundTrip(t *testing.T) {
	payload := []byte{0x19, 0x00, 0x00, 0x00, 0x06, 0x00, 0x01, 0x00}
	frame, err := encodemuxframe("abc123", payload)
	if err != nil {
		t.Fatal(err)
	}
	id, out, err := decodemuxframe(frame)
	if err != nil {
		t.Fatal(err)
	}
	if id != "abc123" {
		t.Fatalf("id %q", id)
	}
	if string(out) != string(payload) {
		t.Fatalf("payload mismatch")
	}
}

func TestSessionIDPad(t *testing.T) {
	_, err := encodemuxframe("12345678901234567", nil)
	if err == nil {
		t.Fatal("expected long id error")
	}
}

func TestControlEncode(t *testing.T) {
	raw, err := encodecontrol("new-session", "deadbeef")
	if err != nil {
		t.Fatal(err)
	}
	msg, err := decodecontrol(raw)
	if err != nil {
		t.Fatal(err)
	}
	if msg.Type != "new-session" || msg.ID != "deadbeef" {
		t.Fatalf("unexpected %+v", msg)
	}
}
