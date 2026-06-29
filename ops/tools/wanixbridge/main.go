package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"strings"
)

func main() {
	log.SetFlags(log.Ltime | log.Lshortfile)

	var (
		listen      = flag.String("listen", defaultListen, "address to listen on")
		token       = flag.String("token", "", "shared auth token (auto-generated if empty)")
		hostpath    = flag.String("host-path", defaultHostPath, "websocket path for browser host")
		maxsessions = flag.Int("max-sessions", defaultMaxSession, "max concurrent client sessions")
		publicbase  = flag.String("public-base", "", "HTTPS dev app base (e.g. https://localhost:7777) for wss proxy URLs")
	)
	flag.Parse()

	tok := strings.TrimSpace(*token)
	if tok == "" {
		var err error
		tok, err = generatetoken()
		if err != nil {
			log.Fatal(err)
		}
	}

	hostpathval := *hostpath
	if !strings.HasPrefix(hostpathval, "/") {
		hostpathval = "/" + hostpathval
	}

	_, port := splitport(*listen)
	lanhost := picklanhost(port)
	urls := buildurls(lanhost, port, tok, hostpathval, *publicbase)

	fmt.Println("wanix-bridge listening on", *listen)
	fmt.Println("token:", tok)
	fmt.Println("host url:", urls.hosturl)
	fmt.Println("import url:", urls.importurl)
	fmt.Println("tape:", urls.tapeline)
	if strings.TrimSpace(*publicbase) != "" {
		fmt.Println("direct host:", urls.directhost)
		fmt.Println("direct import:", urls.directimport)
	}

	if err := copytoclipboard(urls.tapeline); err != nil {
		fmt.Println("clipboard:", err)
	} else {
		fmt.Println("clipboard: copied tape command")
	}

	b := newbridge(tok, hostpathval, *maxsessions)
	mux := http.NewServeMux()
	mux.HandleFunc(hostpathval, b.handlehost)
	mux.HandleFunc("/", b.handleclient)

	log.Fatal(http.ListenAndServe(*listen, mux))
}
