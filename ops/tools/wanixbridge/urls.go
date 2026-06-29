package main

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/url"
	"strings"
)

const (
	proxyBridgeHostPath  = "/wanix-bridge-host"
	proxyRemoteImportPath = "/wanix-remote-9p/"
)

type bridgeurls struct {
	hosturl      string
	importurl    string
	tapeline     string
	directhost   string
	directimport string
}

func builddirecturls(host, port, token, hostpath string) (hosturl, importurl string) {
	hosturl = fmt.Sprintf("ws://%s:%s%s?token=%s", host, port, hostpath, token)
	importurl = fmt.Sprintf("ws://%s:%s/?token=%s", host, port, token)
	return hosturl, importurl
}

func buildurls(host, port, token, hostpath, publicbase string) bridgeurls {
	directhost, directimport := builddirecturls(host, port, token, hostpath)
	out := bridgeurls{
		hosturl:      directhost,
		importurl:    directimport,
		tapeline:     fmt.Sprintf("#wanix bridge %s", directhost),
		directhost:   directhost,
		directimport: directimport,
	}
	publicbase = strings.TrimSpace(publicbase)
	if publicbase == "" {
		return out
	}
	parsed, err := url.Parse(publicbase)
	if err != nil {
		return out
	}
	wsscheme := "ws"
	if parsed.Scheme == "https" {
		wsscheme = "wss"
	}
	authority := parsed.Host
	if authority == "" {
		return out
	}
	out.hosturl = fmt.Sprintf("%s://%s%s?token=%s", wsscheme, authority, proxyBridgeHostPath, token)
	out.importurl = fmt.Sprintf("%s://%s%s?token=%s", wsscheme, authority, proxyRemoteImportPath, token)
	out.tapeline = fmt.Sprintf("#wanix bridge %s", out.hosturl)
	return out
}

func generatetoken() (string, error) {
	var raw [16]byte
	if _, err := rand.Read(raw[:]); err != nil {
		return "", err
	}
	return hex.EncodeToString(raw[:]), nil
}
