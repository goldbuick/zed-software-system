package main

import "testing"

func TestBuildurlsDirect(t *testing.T) {
	urls := buildurls("192.168.1.10", "7654", "tok", "/host", "")
	if urls.hosturl != "ws://192.168.1.10:7654/host?token=tok" {
		t.Fatalf("host %q", urls.hosturl)
	}
	if urls.importurl != "ws://192.168.1.10:7654/?token=tok" {
		t.Fatalf("import %q", urls.importurl)
	}
	if urls.tapeline != "#wanix bridge ws://192.168.1.10:7654/host?token=tok" {
		t.Fatalf("tape %q", urls.tapeline)
	}
}

func TestBuildurlsPublicBase(t *testing.T) {
	urls := buildurls("192.168.1.10", "7654", "tok", "/host", "https://localhost:7777")
	if urls.hosturl != "wss://localhost:7777/wanix-bridge-host?token=tok" {
		t.Fatalf("host %q", urls.hosturl)
	}
	if urls.importurl != "wss://localhost:7777/wanix-remote-9p/?token=tok" {
		t.Fatalf("import %q", urls.importurl)
	}
	if urls.directhost != "ws://192.168.1.10:7654/host?token=tok" {
		t.Fatalf("direct host %q", urls.directhost)
	}
	if urls.directimport != "ws://192.168.1.10:7654/?token=tok" {
		t.Fatalf("direct import %q", urls.directimport)
	}
}

func TestBuildurlsPublicBaseHttp(t *testing.T) {
	urls := buildurls("127.0.0.1", "7654", "abc", "/host", "http://localhost:7777/")
	if urls.hosturl != "ws://localhost:7777/wanix-bridge-host?token=abc" {
		t.Fatalf("host %q", urls.hosturl)
	}
}
